package com.github.scadar.kaitenplugin.ui.views

import com.github.scadar.kaitenplugin.application.FilterService
import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.application.UserService
import com.github.scadar.kaitenplugin.domain.Column
import com.github.scadar.kaitenplugin.domain.Task
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.awt.BorderLayout
import java.awt.CardLayout
import java.awt.Font
import javax.swing.BoxLayout
import javax.swing.JPanel
import javax.swing.SwingConstants
import javax.swing.SwingUtilities

class TaskListView(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val userService = UserService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val contentPanel = JPanel().apply {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
    }

    private val cardLayout = CardLayout()
    private val container = JPanel(cardLayout)

    // Cached result of last load (already filter-service filtered)
    private var loadedTasks: List<Task> = emptyList()
    private var loadedColumns: List<Column> = emptyList()

    // Current text query (set from outside via applySearch / from refreshTasks)
    private var searchQuery: String = ""

    init {
        setupUI()
        refreshTasks()
    }

    private fun setupUI() {
        val loadingPanel = JPanel(BorderLayout()).apply {
            add(
                JBLabel("Loading tasks...", SwingConstants.CENTER).apply {
                    foreground = foreground.darker()
                },
                BorderLayout.CENTER
            )
        }

        container.add(loadingPanel, "LOADING")
        container.add(JBScrollPane(contentPanel).apply { border = JBUI.Borders.empty() }, "CONTENT")

        add(container, BorderLayout.CENTER)
    }

    /** Called when the search field changes — instant client-side re-filter, no API call. */
    fun applySearch(query: String) {
        searchQuery = query
        SwingUtilities.invokeLater { updateDisplay() }
    }

    /** Reload tasks from API (passes current searchQuery as server-side filter). */
    fun refreshTasks() {
        SwingUtilities.invokeLater { cardLayout.show(container, "LOADING") }

        scope.launch {
            val allTasks = mutableListOf<Task>()
            val allColumns = mutableListOf<Column>()

            val serverSearch = searchQuery.takeIf { it.isNotBlank() }

            val boardId = settings.selectedBoardId
            if (boardId != null) {
                allTasks.addAll(taskService.getTasks(boardId, searchText = serverSearch))
                allColumns.addAll(taskService.getColumns(boardId))
            }

            val currentUser = userService.getCurrentUser()

            val filteredTasks = filterService.filterTasks(
                tasks = allTasks,
                currentUser = currentUser,
                selectedColumnIds = settings.selectedColumnIds,
                filterByAssignee = settings.filterByAssignee,
                filterByParticipant = settings.filterByParticipant,
                filterLogic = settings.filterLogic
            )

            SwingUtilities.invokeLater {
                loadedTasks = filteredTasks
                loadedColumns = allColumns
                updateDisplay()
                cardLayout.show(container, "CONTENT")
            }
        }
    }

    private fun updateDisplay() {
        val displayTasks = if (searchQuery.isBlank()) {
            loadedTasks
        } else {
            loadedTasks.filter {
                it.title.contains(searchQuery, ignoreCase = true) ||
                        it.id.toString().contains(searchQuery)
            }
        }

        val tasksByColumn = displayTasks.groupBy { it.columnId }

        contentPanel.removeAll()

        if (tasksByColumn.isEmpty()) {
            val msg = when {
                settings.selectedBoardId == null -> "Select a board in the filters panel."
                searchQuery.isNotBlank() -> "No tasks match \"$searchQuery\"."
                else -> "No tasks found. Adjust your filters."
            }
            contentPanel.add(
                JBLabel(msg, SwingConstants.CENTER).apply {
                    foreground = foreground.darker()
                    border = JBUI.Borders.empty(12)
                }
            )
        } else {
            loadedColumns.sortedBy { it.position }.forEach { column ->
                val tasksInColumn = tasksByColumn[column.id] ?: emptyList()
                if (tasksInColumn.isNotEmpty()) {
                    addColumnSection(column.name, tasksInColumn)
                }
            }
        }

        contentPanel.revalidate()
        contentPanel.repaint()
    }

    private fun addColumnSection(columnName: String, tasks: List<Task>) {
        val columnLabel = JBLabel(columnName).apply {
            font = font.deriveFont(Font.BOLD, 13f)
            border = JBUI.Borders.empty(8, 6, 2, 6)
        }
        contentPanel.add(columnLabel)

        tasks.forEach { task ->
            val taskPanel = JPanel(BorderLayout()).apply {
                border = JBUI.Borders.empty(1, 16, 1, 6)
            }
            taskPanel.add(JBLabel("[#${task.id}] ${task.title}"), BorderLayout.WEST)
            contentPanel.add(taskPanel)
        }

        contentPanel.add(JPanel().apply { maximumSize = java.awt.Dimension(Int.MAX_VALUE, 6) })
    }
}
