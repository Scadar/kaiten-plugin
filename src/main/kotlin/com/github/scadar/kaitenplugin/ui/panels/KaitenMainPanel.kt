package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.application.FilterService
import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.github.scadar.kaitenplugin.ui.views.KanbanCardView
import com.github.scadar.kaitenplugin.ui.views.TaskListView
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBTabbedPane
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.awt.BorderLayout
import javax.swing.JPanel

class KaitenMainPanel(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val filtersPanel = FiltersPanel(project, scope)
    private val listView = TaskListView(project)
    private val cardView = KanbanCardView(project)
    private val statisticsPanel = StatisticsPanel(project)

    private val viewTabbedPane = JBTabbedPane()

    init {
        setupUI()
        loadInitialData()
    }

    private fun setupUI() {
        // Add filters panel at the top
        add(filtersPanel, BorderLayout.NORTH)

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
