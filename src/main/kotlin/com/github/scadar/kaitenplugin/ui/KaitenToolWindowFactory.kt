package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.state.StateSyncService
import com.github.scadar.kaitenplugin.timetracker.GitBranchListener
import com.github.scadar.kaitenplugin.timetracker.IdeFocusTracker
import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import git4idea.repo.GitRepository
import java.io.File
import java.nio.file.Paths

/**
 * Factory for creating the Kaiten tool window with React UI embedded in JCEF browser
 */
class KaitenToolWindowFactory : ToolWindowFactory {
    private val log = logger<KaitenToolWindowFactory>()

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        // Check if JCEF is supported in this environment
        if (!JBCefApp.isSupported()) {
            log.error("JCEF is not supported in this environment. Kaiten plugin requires JCEF support.")
            // TODO: Show fallback UI or error message
            return
        }

        try {
            // Create JCEF browser instance
            val browser = JBCefBrowser()

            // Initialize bridge handler for IDE ↔ React communication
            val bridgeHandler = JCEFBridgeHandler(browser)

            // Register bridge disposal with tool window
            Disposer.register(toolWindow.disposable) {
                bridgeHandler.dispose()
                browser.dispose()
            }

            // Register RPC handlers for IDE operations
            registerRPCHandlers(project, bridgeHandler)

            // Initialize state synchronization service
            val stateSyncService = project.service<StateSyncService>()
            stateSyncService.initialize(bridgeHandler)

            // Load React application
            loadReactApp(browser)

            // Add browser component to tool window
            val contentFactory = ContentFactory.getInstance()
            val content = contentFactory.createContent(browser.component, "", false)
            toolWindow.contentManager.addContent(content)

            log.info("JCEF browser initialized and React app loaded")

            // Initialize tracking components
            initializeTimeTracking(project)
        } catch (e: Exception) {
            log.error("Failed to create JCEF browser for Kaiten tool window", e)
            // TODO: Show fallback UI or error message
        }
    }

    /**
     * Load React application in JCEF browser
     */
    private fun loadReactApp(browser: JBCefBrowser) {
        try {
            // Get the plugin's base directory
            // In development: loads from ui/dist/index.html
            // In production: loads from plugin JAR resources
            val htmlFile = getReactBuildPath()

            if (htmlFile.exists()) {
                val url = htmlFile.toURI().toString()
                log.info("Loading React app from: $url")
                browser.loadURL(url)
            } else {
                log.error("React build not found at: ${htmlFile.absolutePath}")
                // Load fallback error page
                browser.loadHTML(
                    """
                    <!DOCTYPE html>
                    <html>
                    <head><title>Error</title></head>
                    <body style="font-family: Arial, sans-serif; padding: 20px; background: #2B2B2B; color: #FFFFFF;">
                        <h1>React UI Not Found</h1>
                        <p>The React application build could not be found.</p>
                        <p>Expected location: ${htmlFile.absolutePath}</p>
                        <p>Please run: <code>cd ui && npm run build</code></p>
                    </body>
                    </html>
                    """.trimIndent()
                )
            }
        } catch (e: Exception) {
            log.error("Failed to load React app in JCEF browser", e)
        }
    }

    /**
     * Get the path to React build index.html
     */
    private fun getReactBuildPath(): File {
        // 1. Resolve via the plugin's actual installation directory (works in sandbox and production)
        val plugin = PluginManagerCore.getPlugin(PluginId.getId("com.github.scadar.kaitenplugin"))
        if (plugin != null) {
            val uiPath = plugin.pluginPath.resolve("ui/dist/index.html").toFile()
            if (uiPath.exists()) {
                return uiPath
            }
            log.warn("Plugin found but UI not at pluginPath: ${plugin.pluginPath}")
        }

        // 2. Check sandbox plugins directory via PathManager
        val sandboxPath = Paths.get(
            PathManager.getConfigPath(), "..", "plugins", "kaiten-plugin", "ui", "dist", "index.html"
        ).normalize().toFile()
        if (sandboxPath.exists()) {
            return sandboxPath
        }

        // 3. Check the system plugins path (another sandbox location)
        val systemPluginsPath = Paths.get(
            PathManager.getPluginsPath(), "kaiten-plugin", "ui", "dist", "index.html"
        ).toFile()
        if (systemPluginsPath.exists()) {
            return systemPluginsPath
        }

        // 4. Fallback: path relative to working directory
        return Paths.get(System.getProperty("user.dir"), "ui", "dist", "index.html").toFile()
    }

    /**
     * Register RPC handlers for IDE operations accessible from React
     */
    private fun registerRPCHandlers(project: Project, bridgeHandler: JCEFBridgeHandler) {
        // Register getProjectPath RPC handler
        bridgeHandler.registerRPC("getProjectPath") { _ ->
            project.basePath
        }

        // Register getProjectName RPC handler
        bridgeHandler.registerRPC("getProjectName") { _ ->
            project.name
        }

        // Register getSettings RPC handler
        bridgeHandler.registerRPC("getSettings") { _ ->
            val settings = com.github.scadar.kaitenplugin.settings.KaitenSettingsState.getInstance()
            mapOf(
                "apiToken" to settings.apiToken,
                "serverUrl" to settings.serverUrl,
                "selectedSpaceId" to settings.selectedSpaceId,
                "selectedBoardId" to settings.selectedBoardId,
                "selectedColumnIds" to settings.selectedColumnIds.toList(),
                "filterByAssignee" to settings.filterByAssignee,
                "filterByParticipant" to settings.filterByParticipant,
                "filterLogic" to settings.filterLogic
            )
        }

        // Register updateSettings RPC handler
        bridgeHandler.registerRPC("updateSettings") { params ->
            val settings = com.github.scadar.kaitenplugin.settings.KaitenSettingsState.getInstance()
            @Suppress("UNCHECKED_CAST")
            val updates = params as? Map<String, Any?> ?: return@registerRPC false

            updates["apiToken"]?.let { settings.apiToken = it as String }
            updates["serverUrl"]?.let { settings.serverUrl = it as String }
            updates["selectedSpaceId"]?.let { settings.selectedSpaceId = it as? Long }
            updates["selectedBoardId"]?.let { settings.selectedBoardId = it as? Long }
            updates["selectedColumnIds"]?.let {
                @Suppress("UNCHECKED_CAST")
                settings.selectedColumnIds = (it as List<Long>).toMutableSet()
            }
            updates["filterByAssignee"]?.let { settings.filterByAssignee = it as Boolean }
            updates["filterByParticipant"]?.let { settings.filterByParticipant = it as Boolean }
            updates["filterLogic"]?.let { settings.filterLogic = it as String }

            true
        }

        // Register openFile RPC handler
        bridgeHandler.registerRPC("openFile") { params ->
            @Suppress("UNCHECKED_CAST")
            val filePath = params as? String ?: return@registerRPC false

            // TODO: Implement file opening logic using VirtualFileManager
            log.info("Open file requested: $filePath")
            true
        }

        // Register showNotification RPC handler
        bridgeHandler.registerRPC("showNotification") { params ->
            @Suppress("UNCHECKED_CAST")
            val notification = params as? Map<String, Any?> ?: return@registerRPC false
            val message = notification["message"] as? String ?: "No message"
            val type = notification["type"] as? String ?: "info"

            // TODO: Implement notification display using IntelliJ Notification API
            log.info("Notification requested ($type): $message")
            true
        }

        log.debug("Registered RPC handlers for IDE operations")
    }

    /**
     * Initialize time tracking components
     */
    private fun initializeTimeTracking(project: Project) {
        // Initialize focus tracker
        val focusTracker = IdeFocusTracker.getInstance(project)
        focusTracker.initialize()

        // Subscribe to git repository changes
        project.messageBus.connect().subscribe(
            GitRepository.GIT_REPO_CHANGE,
            GitBranchListener(project)
        )
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}
