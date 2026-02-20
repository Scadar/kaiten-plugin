package com.github.scadar.kaitenplugin.ui.panels

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
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.components.JBTabbedPane
import com.intellij.ui.components.JBTextField
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.awt.BorderLayout
import java.awt.Dimension
import javax.swing.JSplitPane
import javax.swing.JPanel
import javax.swing.event.DocumentEvent
import javax.swing.event.DocumentListener

class KaitenMainPanel(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    private val taskService = TaskService.getInstance()
    private val userService = UserService.getInstance()
    private val notificationService = NotificationService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val filtersPanel = FiltersPanel(project, scope)
    private val listView = TaskListView(project)
    private val cardView = KanbanCardView(project)
    private val statisticsPanel = StatisticsPanel(project)

    private val searchField = JBTextField().apply {
        emptyText.text = "Search tasks by title or ID..."
    }

    private val viewTabbedPane = JBTabbedPane()
    private val toolbar = createToolbar()

    // Debounce timer for server-side search
    private var searchTimer: javax.swing.Timer? = null

    init {
        setupUI()
        loadInitialData()
    }

    private fun setupUI() {
        // Top bar: toolbar + search field
        val topPanel = JPanel(BorderLayout())
        topPanel.add(toolbar.component, BorderLayout.WEST)
        topPanel.add(searchField, BorderLayout.CENTER)
        add(topPanel, BorderLayout.NORTH)

        // Wire search field
        searchField.document.addDocumentListener(object : DocumentListener {
            override fun insertUpdate(e: DocumentEvent) = onSearchChanged()
            override fun removeUpdate(e: DocumentEvent) = onSearchChanged()
            override fun changedUpdate(e: DocumentEvent) = onSearchChanged()
        })

        // Tabs
        viewTabbedPane.addTab("List", listView)
        viewTabbedPane.addTab("Kanban", cardView)
        viewTabbedPane.addTab("Statistics", statisticsPanel)

        val selectedIndex = when (settings.viewMode) {
            "CARDS" -> 1
            "STATISTICS" -> 2
            else -> 0
        }
        viewTabbedPane.selectedIndex = selectedIndex

        viewTabbedPane.addChangeListener {
            settings.viewMode = when (viewTabbedPane.selectedIndex) {
                1 -> "CARDS"
                2 -> "STATISTICS"
                else -> "LIST"
            }
        }

        // Split pane: filters sidebar on left, tabs on right
        val filtersScrollPane = JBScrollPane(filtersPanel).apply {
            preferredSize = Dimension(240, 0)
            minimumSize = Dimension(160, 0)
        }

        val splitPane = JSplitPane(JSplitPane.HORIZONTAL_SPLIT, filtersScrollPane, viewTabbedPane).apply {
            dividerLocation = 240
            isOneTouchExpandable = true
            dividerSize = 5
        }

        add(splitPane, BorderLayout.CENTER)
    }

    private fun onSearchChanged() {
        val query = searchField.text.trim()

        // Immediate client-side filter for instant feedback
        listView.applySearch(query)
        cardView.applySearch(query)

        // Debounced server-side reload (500ms after typing stops)
        searchTimer?.stop()
        searchTimer = javax.swing.Timer(500) {
            listView.refreshTasks()
            cardView.refreshTasks()
        }.apply {
            isRepeats = false
            start()
        }
    }

    private fun createToolbar(): ActionToolbar {
        val actionGroup = DefaultActionGroup()

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
