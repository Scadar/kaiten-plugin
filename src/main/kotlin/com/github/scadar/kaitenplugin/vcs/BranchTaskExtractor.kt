package com.github.scadar.kaitenplugin.vcs

import com.intellij.openapi.project.Project
import git4idea.repo.GitRepositoryManager

object BranchTaskExtractor {

    /**
     * Converts each branch pattern (e.g. "task/ktn-{id}") into a regex by
     * substituting `{id}` with a capturing numeric group, then tries to match
     * [branchName] against each pattern in order.
     *
     * Returns the first extracted numeric task ID, or null if none match.
     */
    fun extractTaskId(branchName: String, patterns: List<String>): Long? {
        for (pattern in patterns) {
            // Split on the {id} placeholder, escape each literal part, then rejoin
            // with a capturing numeric group. This avoids the \Q...\E boundary
            // problem that arises when calling Regex.escape on the whole string.
            val regexSource = pattern.split("{id}")
                .joinToString("""(\d+)""") { Regex.escape(it) }
            val id = Regex(regexSource, RegexOption.IGNORE_CASE)
                .find(branchName)?.groupValues?.get(1)?.toLongOrNull()
            if (id != null) return id
        }
        return null
    }

    fun extractTaskId(project: Project, patterns: List<String>): Long? {
        val branch = GitRepositoryManager.getInstance(project)
            .repositories.firstOrNull()?.currentBranchName ?: return null
        return extractTaskId(branch, patterns)
    }

    /**
     * Formats a commit message by substituting `{id}` and `{title}` in [template].
     * If [title] is null (e.g. the API call failed), `{title}` is replaced with an empty string.
     */
    fun buildCommitMessage(template: String, taskId: Long, title: String?): String =
        template
            .replace("{id}", taskId.toString())
            .replace("{title}", title ?: "")
}
