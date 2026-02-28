package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.bridge.EventNames
import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.state.StateSyncService
import com.github.scadar.kaitenplugin.timetracker.GitBranchListener
import com.github.scadar.kaitenplugin.timetracker.IdeFocusTracker
import com.intellij.icons.AllIcons
import com.intellij.ide.ui.LafManagerListener
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import git4idea.repo.GitRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Factory for creating the Kaiten tool window with React UI embedded in a JCEF browser.
 *
 * Responsibilities are kept minimal here:
 * - JCEF availability check and browser lifecycle
 * - Wiring [IdeRpcHandlerRegistry], [StateSyncService], and [ReactAppLoader]
 * - Time-tracking initialisation
 * - DevTools action
 *
 * Threading: [ReactAppLoader.load] is a suspend function that does file I/O on
 * [Dispatchers.IO], so we launch it from a [CoroutineScope] tied to the tool window's
 * [Disposable]. This keeps the EDT free of any blocking filesystem calls.
 */
class KaitenToolWindowFactory : ToolWindowFactory {

    private val log = logger<KaitenToolWindowFactory>()

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        if (!JBCefApp.isSupported()) {
            log.error("JCEF is not supported in this environment. Kaiten Integration plugin requires JCEF support.")
            return
        }

        try {
            val browser       = JBCefBrowser()
            val bridgeHandler = JCEFBridgeHandler(browser)

            // Scope lifetime is bound to the tool window — cancelled automatically on dispose.
            val windowScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

            Disposer.register(toolWindow.disposable) {
                windowScope.cancel()
                bridgeHandler.dispose()
                browser.dispose()
            }

            val rpcRegistry = IdeRpcHandlerRegistry(project)
            rpcRegistry.register(bridgeHandler)
            project.service<StateSyncService>().initialize(bridgeHandler)

            // Re-send IDE theme whenever the user switches the IDE color scheme.
            val lafConnection = ApplicationManager.getApplication().messageBus.connect()
            Disposer.register(toolWindow.disposable) { lafConnection.disconnect() }
            lafConnection.subscribe(LafManagerListener.TOPIC, LafManagerListener { _ ->
                bridgeHandler.emitEvent(EventNames.THEME_CHANGED, rpcRegistry.buildIdeThemeMap())
            })

            // ReactAppLoader.load is a suspend fun: file probing on IO, loadURL on EDT.
            // Must NOT be called synchronously on EDT.
            windowScope.launch { ReactAppLoader.load(browser) }

            toolWindow.setTitleActions(listOf(devToolsAction(browser)))

            val content = ContentFactory.getInstance().createContent(browser.component, "", false)
            toolWindow.contentManager.addContent(content)

            log.info("JCEF browser initialised, React app loading asynchronously")

            initializeTimeTracking(project, toolWindow)
        } catch (e: Exception) {
            log.error("Failed to create JCEF browser for Kaiten Integration tool window", e)
        }
    }

    private fun devToolsAction(browser: JBCefBrowser): AnAction =
        object : AnAction("Open DevTools", "Open JCEF DevTools", AllIcons.General.Settings) {
            override fun actionPerformed(e: AnActionEvent) = browser.openDevtools()
        }

    private fun initializeTimeTracking(project: Project, toolWindow: ToolWindow) {
        IdeFocusTracker.getInstance(project).initialize()
        // FIX: bind MessageBusConnection to toolWindow.disposable to prevent memory leaks
        // and duplicate listeners when the tool window is reopened.
        val gitConnection = project.messageBus.connect()
        Disposer.register(toolWindow.disposable) { gitConnection.disconnect() }
        gitConnection.subscribe(GitRepository.GIT_REPO_CHANGE, GitBranchListener(project))
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}
