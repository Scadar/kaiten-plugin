package com.github.scadar.kaitenplugin.ui

import com.intellij.ide.plugins.PluginManagerCore
import com.intellij.openapi.application.PathManager
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.extensions.PluginId
import com.intellij.ui.jcef.JBCefBrowser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.nio.file.Paths

/**
 * Responsible for locating and loading the React build inside a JCEF browser.
 *
 * In dev mode (system property [DEV_SERVER_PROPERTY] is set), loads directly from
 * the Vite dev server (see [devServerUrl]). The dev server is started automatically
 * by the Gradle `runIde` task when the `-Pdev` flag is passed.
 *
 * Path resolution order (production):
 * 1. Plugin distribution directory (production installs).
 * 2. IDE sandbox plugins directory (development / `runIde` Gradle task).
 * 3. System plugins directory.
 * 4. Current working directory (fallback for local dev without sandbox).
 *
 * Threading: [load] is a suspend function. All [File.exists] probing runs on [Dispatchers.IO]
 * so the EDT is never blocked by filesystem syscalls. The final browser interaction switches
 * back to [Dispatchers.Main] (EDT) because JCEF requires it.
 */
object ReactAppLoader {

    private val log = logger<ReactAppLoader>()
    private const val PLUGIN_ID = "com.github.scadar.kaitenplugin"
    private const val RELATIVE_UI_PATH = "ui/dist/index.html"

    /** Fallback plugin directory name used when PluginManagerCore cannot resolve the path. */
    private const val PLUGIN_DIR_NAME = "Kaiten"

    /** System property that enables dev-server mode. Set via `-Dkaiten.ui.dev=true`. */
    private const val DEV_SERVER_PROPERTY = "kaiten.ui.dev"

    /**
     * URL of the Vite dev server started with `npm run dev`.
     *
     * The port is read from a temp file written by the Gradle `runIde` task (dev mode).
     * Falls back to Vite's default port 5173 if the file is absent.
     */
    private val devServerUrl: String
        get() {
            val port = runCatching {
                File(System.getProperty("java.io.tmpdir"), "kaiten-vite-dev.port")
                    .takeIf { it.exists() }
                    ?.readText()
                    ?.trim()
            }.getOrNull() ?: "5173"
            return "http://localhost:$port"
        }

    /**
     * Locates the React build and loads it into [browser].
     *
     * In dev mode loads from the Vite dev server (HMR works automatically).
     * Must be called from a coroutine. File I/O runs on [Dispatchers.IO];
     * browser interaction runs on [Dispatchers.Main] (EDT).
     */
    suspend fun load(browser: JBCefBrowser) {
        if (System.getProperty(DEV_SERVER_PROPERTY) != null) {
            val url = devServerUrl
            withContext(Dispatchers.Main) {
                log.info("Dev mode: loading React app from Vite dev server at $url")
                browser.loadURL(url)
            }
            return
        }

        val result = withContext(Dispatchers.IO) {
            try {
                val file = findBuildFile()
                if (file.exists()) LoadResult.Found(file.toURI().toString())
                else               LoadResult.Missing(file.absolutePath)
            } catch (e: Exception) {
                LoadResult.Error(e)
            }
        }

        // All JBCefBrowser calls must happen on EDT.
        withContext(Dispatchers.Main) {
            when (result) {
                is LoadResult.Found -> {
                    log.info("Loading React app from: ${result.url}")
                    browser.loadURL(result.url)
                }
                is LoadResult.Missing -> {
                    log.error("React build not found at: ${result.expectedPath}")
                    browser.loadHTML(buildErrorHtml(result.expectedPath))
                }
                is LoadResult.Error -> {
                    log.error("Failed to resolve React app path", result.cause)
                    browser.loadHTML(buildErrorHtml("<resolution failed: ${result.cause.message}>"))
                }
            }
        }
    }

    // Runs entirely on Dispatchers.IO — File.exists() is a blocking syscall.
    private fun findBuildFile(): File {
        val plugin = PluginManagerCore.getPlugin(PluginId.getId(PLUGIN_ID))

        if (plugin != null) {
            val path = plugin.pluginPath.resolve(RELATIVE_UI_PATH).toFile()
            if (path.exists()) return path
            log.warn("Plugin found but UI not at pluginPath: ${plugin.pluginPath}")
        }

        // Derive the actual plugin directory name from PluginManagerCore when possible,
        // so this code stays correct regardless of plugin renames.
        val pluginDirName = plugin?.pluginPath?.fileName?.toString() ?: PLUGIN_DIR_NAME

        val sandboxPath = Paths.get(
            PathManager.getConfigPath(), "..", "plugins", pluginDirName, RELATIVE_UI_PATH
        ).normalize().toFile()
        if (sandboxPath.exists()) return sandboxPath

        val systemPath = Paths.get(
            PathManager.getPluginsPath(), pluginDirName, RELATIVE_UI_PATH
        ).toFile()
        if (systemPath.exists()) return systemPath

        return Paths.get(System.getProperty("user.dir"), RELATIVE_UI_PATH).toFile()
    }

    private fun buildErrorHtml(expectedPath: String): String = """
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; padding: 20px; background: #2B2B2B; color: #FFFFFF;">
            <h1>React UI Not Found</h1>
            <p>The React application build could not be found.</p>
            <p>Expected location: $expectedPath</p>
            <p>Please run: <code>cd ui &amp;&amp; npm run build</code></p>
        </body>
        </html>
    """.trimIndent()

    private sealed class LoadResult {
        data class Found(val url: String) : LoadResult()
        data class Missing(val expectedPath: String) : LoadResult()
        data class Error(val cause: Exception) : LoadResult()
    }
}
