package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import git4idea.commands.Git
import git4idea.commands.GitCommand
import git4idea.commands.GitLineHandler
import git4idea.repo.GitRepositoryManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GitRpcHandlers(private val project: Project) : RpcHandlerGroup {

    private val log = logger<GitRpcHandlers>()

    override fun register(bridge: JCEFBridgeHandler) {
        /**
         * Returns git commit log for a branch (or HEAD when `branchName` is null).
         * Params: `{ branchName?: string, maxCount?: number }`
         * Result: `{ hash, fullHash, author, email, timestamp, message }[]`
         */
        bridge.registerRPC(RPCMethodNames.GET_GIT_LOG) { params ->
            @Suppress("UNCHECKED_CAST")
            val p          = params as? Map<String, Any?> ?: return@registerRPC emptyList<Any>()
            val branchName = p["branchName"] as? String
            val maxCount   = (p["maxCount"] as? Number)?.toInt() ?: 30

            val repo = withContext(Dispatchers.Main) {
                GitRepositoryManager.getInstance(project).repositories.firstOrNull()
            } ?: return@registerRPC emptyList<Any>()

            withContext(Dispatchers.IO) {
                try {
                    val handler = GitLineHandler(project, repo.root, GitCommand.LOG)
                    handler.addParameters("--max-count=$maxCount")
                    // %x1f = ASCII Unit Separator (0x1F) — safe field delimiter
                    handler.addParameters("--pretty=format:%H%x1f%an%x1f%ae%x1f%at%x1f%s")
                    if (branchName != null) handler.addParameters(branchName)

                    val result = Git.getInstance().runCommand(handler)
                    if (!result.success()) return@withContext emptyList()

                    result.output.mapNotNull { line ->
                        val parts = line.split("\u001f")
                        if (parts.size < 5) return@mapNotNull null
                        mapOf(
                            "hash"      to parts[0].take(7),
                            "fullHash"  to parts[0],
                            "author"    to parts[1],
                            "email"     to parts[2],
                            "timestamp" to ((parts[3].toLongOrNull() ?: 0L) * 1000L),
                            "message"   to parts[4]
                        )
                    }
                } catch (e: Exception) {
                    log.warn("Failed to get git log for branch '$branchName'", e)
                    emptyList()
                }
            }
        }

        /**
         * Checks whether each given branch has been merged into `releaseBranch`.
         * Uses `git merge-base --is-ancestor <branch> <releaseBranch>` — one fast
         * read-only call per branch, so only the requested branches are examined.
         * Both local and remote (origin/<branch>) refs are checked for each branch.
         *
         * Params: `{ releaseBranch: string, branches: string[] }`
         * Result: `{ results: Record<branch, boolean> }` on success, `{ error: string }` on failure.
         */
        bridge.registerRPC(RPCMethodNames.CHECK_BRANCHES_MERGED) { params ->
            @Suppress("UNCHECKED_CAST")
            val p = params as? Map<String, Any?>
                ?: return@registerRPC mapOf("error" to "Invalid params")
            val releaseBranch = p["releaseBranch"] as? String
                ?: return@registerRPC mapOf("error" to "Missing releaseBranch parameter")
            @Suppress("UNCHECKED_CAST")
            val branches = (p["branches"] as? List<*>)?.filterIsInstance<String>()
                ?: return@registerRPC mapOf("error" to "Missing branches parameter")

            val repo = withContext(Dispatchers.Main) {
                GitRepositoryManager.getInstance(project).repositories.firstOrNull()
            } ?: return@registerRPC mapOf("error" to "No git repository found in this project")

            withContext(Dispatchers.IO) {
                try {
                    // Determine effective release branch ref: prefer local, fall back to remote.
                    val localReleaseHandler = GitLineHandler(project, repo.root, GitCommand.BRANCH)
                    localReleaseHandler.addParameters("--list", releaseBranch)
                    val localReleaseExists = Git.getInstance().runCommand(localReleaseHandler)
                        .output.any { it.trim().trimStart('*', ' ').isNotBlank() }

                    val effectiveReleaseBranch = if (localReleaseExists) {
                        releaseBranch
                    } else {
                        val remoteReleaseHandler = GitLineHandler(project, repo.root, GitCommand.BRANCH)
                        remoteReleaseHandler.addParameters("-r", "--list", "origin/$releaseBranch")
                        val remoteReleaseExists = Git.getInstance().runCommand(remoteReleaseHandler)
                            .output.any { it.trim().isNotBlank() }
                        if (remoteReleaseExists) "origin/$releaseBranch"
                        else return@withContext mapOf("error" to "Branch '$releaseBranch' not found")
                    }

                    // For each requested branch, run `git merge-base --is-ancestor`.
                    // exit 0 → ancestor (merged), exit 1 → not ancestor, exit 128 → branch unknown.
                    // Check local ref first; if not merged, also check remote (origin/<branch>).
                    val results = branches.associateWith { branch ->
                        val localHandler = GitLineHandler(project, repo.root, GitCommand.MERGE_BASE)
                        localHandler.addParameters("--is-ancestor", branch, effectiveReleaseBranch)
                        val mergedLocally = Git.getInstance().runCommand(localHandler).success()

                        if (mergedLocally) {
                            true
                        } else {
                            val remoteHandler = GitLineHandler(project, repo.root, GitCommand.MERGE_BASE)
                            remoteHandler.addParameters("--is-ancestor", "origin/$branch", effectiveReleaseBranch)
                            Git.getInstance().runCommand(remoteHandler).success()
                        }
                    }

                    mapOf("results" to results)
                } catch (e: Exception) {
                    log.warn("Failed to check branches for '$releaseBranch'", e)
                    mapOf("error" to "Failed to check branches: ${e.message}")
                }
            }
        }
    }
}
