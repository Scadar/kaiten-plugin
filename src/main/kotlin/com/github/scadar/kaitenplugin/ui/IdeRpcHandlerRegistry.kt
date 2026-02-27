package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.github.scadar.kaitenplugin.infrastructure.BranchTimeEntriesState
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.github.scadar.kaitenplugin.settings.SettingsMapper
import com.github.scadar.kaitenplugin.timetracker.BranchTimeTrackingService
import com.google.gson.Gson
import com.intellij.openapi.diagnostic.logger
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.ui.JBColor
import git4idea.commands.Git
import git4idea.repo.GitRepositoryManager
import git4idea.commands.GitCommand
import git4idea.commands.GitLineHandler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.IOException
import java.net.SocketTimeoutException
import javax.swing.UIManager

/**
 * Registers all IDE-side RPC handlers on a [JCEFBridgeHandler].
 *
 * Extracting this class keeps [KaitenToolWindowFactory] thin and makes individual
 * handler groups easy to find, test, and modify independently.
 */
class IdeRpcHandlerRegistry(private val project: Project) {

    private val log = logger<IdeRpcHandlerRegistry>()

    // Cached HTTP client — recreated only when token or SSL flag changes.
    @Volatile
    private var cachedHttpClient: Pair<String, okhttp3.OkHttpClient>? = null

    private fun getOrCreateHttpClient(settings: KaitenSettingsState): okhttp3.OkHttpClient {
        val key = settings.apiToken
        cachedHttpClient?.takeIf { it.first == key }?.let { return it.second }
        val client = HttpClientProvider(settings.apiToken).createClient()
        cachedHttpClient = key to client
        return client
    }

    fun register(bridge: JCEFBridgeHandler) {
        registerProjectHandlers(bridge)
        registerSettingsHandlers(bridge)
        registerApiRequestHandler(bridge)
        registerBranchTimeHandlers(bridge)
        registerGitHandlers(bridge)
        registerThemeHandlers(bridge)
        log.debug("Registered all IDE RPC handlers")
    }

    /** Public helper so KaitenToolWindowFactory can build the map on theme changes. */
    fun buildIdeThemeMap(): Map<String, Any> {
        val isDark = !JBColor.isBright()

        fun hex(vararg keys: String): String? {
            for (key in keys) {
                val c = UIManager.getColor(key) ?: continue
                return String.format("#%02x%02x%02x", c.red, c.green, c.blue)
            }
            return null
        }

        fun int(vararg keys: String): Int? {
            for (key in keys) {
                val v = UIManager.get(key) ?: continue
                if (v is Number) return v.toInt()
            }
            return null
        }

        val bgFallback   = if (isDark) "#2b2d30" else "#f2f2f2"
        val fgFallback   = if (isDark) "#dfe1e5" else "#1a1a1a"
        val cardFallback = if (isDark) "#1e1f22" else "#ffffff"

        val labelFont = UIManager.getFont("Label.font")
        val fontName = labelFont?.family
            ?.takeIf { it.isNotBlank() && it != "Dialog" && it != "DialogInput" }
        val fontSize = labelFont?.size ?: 13

        val arc = int("Component.arc", "Button.arc") ?: 6

        return mapOf(
            "isDark"                to isDark,
            "background"            to (hex("Panel.background", "window") ?: bgFallback),
            "foreground"            to (hex("Label.foreground", "windowText") ?: fgFallback),
            "card"                  to (hex("EditorPane.background", "Editor.background", "TextArea.background") ?: cardFallback),
            "cardForeground"        to (hex("Label.foreground", "windowText") ?: fgFallback),
            "popover"               to (hex("PopupMenu.background", "Popup.background", "Panel.background") ?: bgFallback),
            "popoverForeground"     to (hex("Label.foreground", "windowText") ?: fgFallback),
            "primary"               to (hex("Button.default.startBackground", "Link.activeForeground", "Hyperlink.linkColor", "Component.focusColor") ?: if (isDark) "#4e9cff" else "#2970d8"),
            "primaryForeground"     to "#ffffff",
            "secondary"             to (hex("Button.background") ?: if (isDark) "#3c3f41" else "#e8e8e8"),
            "secondaryForeground"   to (hex("Button.foreground", "Label.foreground") ?: fgFallback),
            "muted"                 to (hex("Button.background") ?: if (isDark) "#3c3f41" else "#e8e8e8"),
            "mutedForeground"       to (hex("Label.disabledForeground", "textInactiveText") ?: if (isDark) "#888d94" else "#6c7178"),
            "accent"                to (hex("List.selectionBackground", "Tree.selectionBackground") ?: if (isDark) "#2e436e" else "#dae4f7"),
            "accentForeground"      to (hex("List.selectionForeground", "Tree.selectionForeground") ?: fgFallback),
            "border"                to (hex("Component.borderColor", "Separator.foreground") ?: if (isDark) "#43454a" else "#d1d3da"),
            "input"                 to (hex("TextField.background") ?: if (isDark) "#3c3f41" else "#ffffff"),
            "inputForeground"       to (hex("TextField.foreground", "Label.foreground") ?: fgFallback),
            "ring"                  to (hex("Component.focusColor", "Focus.color", "Hyperlink.linkColor") ?: if (isDark) "#4e9cff" else "#2970d8"),
            "destructive"           to (hex("ToolTip.errorForeground", "Notification.errorForeground") ?: if (isDark) "#e05252" else "#e04343"),
            "destructiveForeground" to "#ffffff",
            "radius"                to "${arc}px",
            "fontSize"              to "${fontSize}px",
            "fontSizeSm"            to "${(fontSize - 1).coerceAtLeast(11)}px",
            "fontSizeXs"            to "${(fontSize - 2).coerceAtLeast(10)}px",
            "fontFamily"            to (fontName ?: ""),
        )
    }

    // ── Project info ──────────────────────────────────────────────────────────

    private fun registerProjectHandlers(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_PROJECT_PATH) { _ ->
            project.basePath
        }

        // FIX: FileEditorManager.getSelectedFiles() accesses EDT-only internal state.
        // RPC handlers run on Dispatchers.Default, so we switch to Main for this one call.
        bridge.registerRPC(RPCMethodNames.GET_SELECTED_FILE) { _ ->
            withContext(Dispatchers.Main) {
                FileEditorManager.getInstance(project).selectedFiles.firstOrNull()?.path
            }
        }

        bridge.registerRPC(RPCMethodNames.GET_PROJECT_NAME) { _ ->
            project.name
        }

        bridge.registerRPC(RPCMethodNames.OPEN_FILE) { params ->
            val filePath = params as? String ?: return@registerRPC false
            log.info("Open file requested: $filePath")
            true
        }

        bridge.registerRPC(RPCMethodNames.OPEN_URL) { params ->
            @Suppress("UNCHECKED_CAST")
            val url = (params as? Map<String, Any?>)?.get("url") as? String
                ?: params as? String
                ?: return@registerRPC false

            val scheme = runCatching { java.net.URI(url).scheme?.lowercase() }.getOrNull()
            if (scheme !in listOf("http", "https")) {
                log.warn("OPEN_URL blocked: unsupported scheme '$scheme' in '$url'")
                return@registerRPC false
            }

            log.info("Open URL requested: $url")
            withContext(Dispatchers.Main) {
                BrowserUtil.browse(url)
            }
            true
        }

        bridge.registerRPC(RPCMethodNames.SHOW_NOTIFICATION) { params ->
            @Suppress("UNCHECKED_CAST")
            val notification = params as? Map<String, Any?> ?: return@registerRPC false
            val message = notification["message"] as? String ?: "No message"
            val type    = notification["type"]    as? String ?: "info"
            log.info("Notification requested ($type): $message")
            true
        }
    }

    // ── Settings ──────────────────────────────────────────────────────────────

    private fun registerSettingsHandlers(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_SETTINGS) { _ ->
            SettingsMapper.toMap(KaitenSettingsState.getInstance())
        }

        bridge.registerRPC(RPCMethodNames.UPDATE_SETTINGS) { params ->
            @Suppress("UNCHECKED_CAST")
            val outerParams = params as? Map<String, Any?> ?: return@registerRPC false
            @Suppress("UNCHECKED_CAST")
            val updates = outerParams["settings"] as? Map<String, Any?> ?: return@registerRPC false
            SettingsMapper.applyMap(updates, KaitenSettingsState.getInstance())
            true
        }

        bridge.registerRPC(RPCMethodNames.OPEN_SETTINGS) { _ ->
            withContext(Dispatchers.Main) {
                com.intellij.openapi.options.ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, "com.github.scadar.kaitenplugin.settings.KaitenSettingsConfigurable")
            }
            true
        }
    }

    // ── Generic API proxy ─────────────────────────────────────────────────────

    private fun registerApiRequestHandler(bridge: JCEFBridgeHandler) {
        val gson = Gson()
        bridge.registerRPC(RPCMethodNames.API_REQUEST) { params ->
            @Suppress("UNCHECKED_CAST")
            val p = params as? Map<String, Any?>
                ?: return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Invalid params")
            val url = p["url"] as? String
                ?: return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Missing url")

            // Validate URL scheme and origin — only allow requests to the configured server.
            val parsedUri = runCatching { java.net.URI(url) }.getOrNull()
            if (parsedUri == null || parsedUri.scheme !in listOf("http", "https")) {
                return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Invalid URL scheme")
            }
            val requestOrigin = "${parsedUri.scheme}://${parsedUri.host}" +
                if (parsedUri.port > 0) ":${parsedUri.port}" else ""
            val settings = KaitenSettingsState.getInstance()
            val configuredOrigin = runCatching {
                java.net.URI(settings.serverUrl).run {
                    "$scheme://$host${if (port > 0) ":$port" else ""}"
                }
            }.getOrNull() ?: ""
            if (requestOrigin != configuredOrigin) {
                log.warn("API_REQUEST blocked: $requestOrigin not in allowed origins ($configuredOrigin)")
                return@registerRPC mapOf("ok" to false, "status" to 403, "message" to "URL not allowed")
            }

            val http    = getOrCreateHttpClient(settings)
            val request = Request.Builder().url(url).get().build()
            try {
                val response = withContext(Dispatchers.IO) { http.newCall(request).execute() }
                val status   = response.code
                val body     = response.body?.string() ?: ""
                if (status == 200) {
                    mapOf("ok" to true,  "status" to status, "body" to gson.fromJson(body, Any::class.java))
                } else {
                    mapOf("ok" to false, "status" to status, "message" to response.message.ifEmpty { "HTTP Error $status" })
                }
            } catch (_: SocketTimeoutException) {
                mapOf("ok" to false, "status" to 0, "message" to "Timeout")
            } catch (_: IOException) {
                mapOf("ok" to false, "status" to 0, "message" to "Network error")
            }
        }
    }

    // ── Branch time tracking ──────────────────────────────────────────────────

    private fun registerBranchTimeHandlers(bridge: JCEFBridgeHandler) {
        /**
         * Returns all persisted branch time entries plus live state for the active branch.
         * Shape: `Record<branchName, { total, daily, isActive, lastActive }>`
         */
        bridge.registerRPC(RPCMethodNames.GET_BRANCH_TIME_ENTRIES) { _ ->
            val state         = BranchTimeEntriesState.getInstance(project)
            val branchService = BranchTimeTrackingService.getInstance(project)
            val activeBranch  = branchService.getCurrentBranch()
            val liveSeconds   = branchService.getUnpersistedSeconds()
            val today         = java.time.LocalDate.now().toString()

            val allEntries = state.getAllEntries().toMutableMap()
            if (activeBranch != null && !allEntries.containsKey(activeBranch)) {
                allEntries[activeBranch] = emptyList()
            }

            allEntries.map { (branch, entries) ->
                val savedTotal = entries.sumOf { it.durationSeconds }
                val isActive   = branch == activeBranch
                val liveAdd    = if (isActive) liveSeconds else 0L

                // Group entries by date, and add live (un-persisted) seconds to today for the active branch
                val dailyMap   = entries
                    .groupBy { it.date.toString() }
                    .mapValues { (_, dayEntries) -> dayEntries.sumOf { it.durationSeconds } }
                    .toMutableMap()
                if (isActive && liveAdd > 0) {
                    dailyMap[today] = (dailyMap[today] ?: 0L) + liveAdd
                }
                val daily = dailyMap
                    .map { (date, seconds) -> mapOf("date" to date, "seconds" to seconds) }
                    .sortedByDescending { it["date"] as String }

                val lastActive = if (isActive) today
                    else entries.maxByOrNull { it.date }?.date?.toString()

                branch to mapOf(
                    "total"      to (savedTotal + liveAdd),
                    "daily"      to daily,
                    "isActive"   to (isActive && branchService.isCurrentlyTracking()),
                    "lastActive" to lastActive
                )
            }.toMap()
        }

        bridge.registerRPC(RPCMethodNames.GET_CURRENT_BRANCH) { _ ->
            val branchService = BranchTimeTrackingService.getInstance(project)
            mapOf(
                "branch"             to branchService.getCurrentBranch(),
                "isTracking"         to branchService.isCurrentlyTracking(),
                "accumulatedSeconds" to branchService.getAccumulatedSeconds()
            )
        }

        bridge.registerRPC(RPCMethodNames.CLEAR_BRANCH_ENTRIES) { params ->
            val branchName = params as? String ?: return@registerRPC false
            BranchTimeEntriesState.getInstance(project).clearBranch(branchName)
            true
        }
    }

    // ── IDE theme ─────────────────────────────────────────────────────────────

    private fun registerThemeHandlers(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_IDE_THEME) { _ ->
            withContext(Dispatchers.Main) { buildIdeThemeMap() }
        }
    }

    // ── Git log / branch checks ───────────────────────────────────────────────

    private fun registerGitHandlers(bridge: JCEFBridgeHandler) {
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
         *   - `true`  — branch (local or remote) is an ancestor of releaseBranch (merged / cherry-picked in)
         *   - `false` — branch is not merged, or neither local nor remote branch exists
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
