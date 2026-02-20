package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.application.FilterService
import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.application.UserService
import com.github.scadar.kaitenplugin.infrastructure.NotificationService
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.github.scadar.kaitenplugin.ui.views.KanbanCardView
import com.github.scadar.kaitenplugin.ui.views.TaskListView
import com.intellij.icons.AllIcons
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionToolbar
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.DefaultActionGroup
import com.intellij.openapi.options.ShowSettingsUtil
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBTabbedPane
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.awt.BorderLayout
import javax.swing.JPanel

class KaitenMainPanel(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val userService = UserService.getInstance()
    private val notificationService = NotificationService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val filtersPanel = FiltersPanel(project, scope)
    private val listView = TaskListView(project)
    private val cardView = KanbanCardView(project)
    private val statisticsPanel = StatisticsPanel(project)

    private val viewTabbedPane = JBTabbedPane()
    private val toolbar = createToolbar()

    init {
        setupUI()
        loadInitialData()
    }

    private fun setupUI() {
        // Add toolbar at the top
        val topPanel = JPanel(BorderLayout())
        topPanel.add(toolbar.component, BorderLayout.WEST)
        topPanel.add(filtersPanel, BorderLayout.CENTER)
        add(topPanel, BorderLayout.NORTH)

        // Add tabbed pane with views
        viewTabbedPane.addTab("List View", listView)
        viewTabbedPane.addTab("Kanban View", cardView)
        viewTabbedPane.addTab("Statistics", statisticsPanel)

        // Restore last selected view
        val selectedIndex = when (settings.viewMode) {
            "CARDS" -> 1
            "STATISTICS" -> 2
            else -> 0
        }
        viewTabbedPane.selectedIndex = selectedIndex

        // Save view mode on tab change
        viewTabbedPane.addChangeListener {
            settings.viewMode = when (viewTabbedPane.selectedIndex) {
                1 -> "CARDS"
                2 -> "STATISTICS"
                else -> "LIST"
            }
        }

        add(viewTabbedPane, BorderLayout.CENTER)
    }

    private fun createToolbar(): ActionToolbar {
        val actionGroup = DefaultActionGroup()

        // Refresh action
        actionGroup.add(object : AnAction("Refresh", "Refresh data from Kaiten", AllIcons.Actions.Refresh) {
            override fun actionPerformed(e: AnActionEvent) {
                scope.launch {
                    try {
                        taskService.invalidateCache()
                        userService.invalidateCache()
                        refreshData()
                        notificationService.showInfo(project, "Refresh Complete", "Data has been refreshed successfully")
                    } catch (ex: Exception) {
                        notificationService.showError(project, "Refresh Failed", ex.message ?: "Unknown error occurred")
                    }
                }
            }
        })

        // Settings action
        actionGroup.add(object : AnAction("Settings", "Open Kaiten Settings", AllIcons.General.Settings) {
            override fun actionPerformed(e: AnActionEvent) {
                ShowSettingsUtil.getInstance().showSettingsDialog(project, "Kaiten")
            }
        })

        return ActionManager.getInstance().createActionToolbar("KaitenToolbar", actionGroup, true)
    }

    private fun loadInitialData() {
        filtersPanel.loadData()
    }

    fun refreshData() {
        filtersPanel.loadData()
        listView.refreshTasks()
        cardView.refreshTasks()
        statisticsPanel.refreshStatistics()
    }
}
