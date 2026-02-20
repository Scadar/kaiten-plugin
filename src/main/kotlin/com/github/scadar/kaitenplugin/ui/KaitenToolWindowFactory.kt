package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.timetracker.GitBranchListener
import com.github.scadar.kaitenplugin.timetracker.IdeFocusTracker
import com.github.scadar.kaitenplugin.ui.panels.KaitenMainPanel
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import git4idea.repo.GitRepository
import git4idea.repo.GitRepositoryChangeListener

class KaitenToolWindowFactory : ToolWindowFactory {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val mainPanel = KaitenMainPanel(project)
        val contentFactory = ContentFactory.getInstance()
        val content = contentFactory.createContent(mainPanel, "", false)
        toolWindow.contentManager.addContent(content)

        // Initialize tracking components
        initializeTimeTracking(project)
    }

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
