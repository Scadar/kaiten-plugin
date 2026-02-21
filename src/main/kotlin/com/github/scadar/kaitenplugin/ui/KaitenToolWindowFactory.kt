package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.timetracker.GitBranchListener
import com.github.scadar.kaitenplugin.timetracker.IdeFocusTracker
import com.intellij.openapi.diagnostic.logger
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
        // Try development path first (ui/dist/index.html relative to project root)
        val projectDir = System.getProperty("user.dir")
        val devPath = Paths.get(projectDir, "ui", "dist", "index.html").toFile()

        if (devPath.exists()) {
            return devPath
        }

        // Try relative to plugin directory (for production builds)
        // This would be set up during the plugin build process
        val pluginPath = Paths.get(projectDir, "build", "idea-sandbox", "plugins", "kaiten-plugin", "ui", "dist", "index.html").toFile()

        if (pluginPath.exists()) {
            return pluginPath
        }

        // Default to dev path (will trigger error page if not found)
        return devPath
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

        // TODO: Register additional RPC handlers as needed
        // Examples:
        // - getTasks, getBoards, getSpaces (via TaskService)
        // - getUser, getCurrentUser (via UserService)
        // - getSettings, updateSettings (via KaitenSettingsState)

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
