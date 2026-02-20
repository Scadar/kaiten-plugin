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
import java.awt.*
import javax.swing.BorderFactory
import javax.swing.BoxLayout
import javax.swing.JPanel
import javax.swing.SwingConstants
import javax.swing.SwingUtilities

class KanbanCardView(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val userService = UserService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val boardPanel = JPanel()
    private val cardLayout = java.awt.CardLayout()
    private val container = JPanel(cardLayout)

    // Cached result of last load (already filter-service filtered)
    private var loadedTasks: List<Task> = emptyList()
    private var loadedColumns: List<Column> = emptyList()

    private var searchQuery: String = ""

    init {
        setupUI()
        refreshTasks()
    }

    private fun setupUI() {
        boardPanel.layout = GridLayout(1, 0, 10, 0)

        val loadingPanel = JPanel(BorderLayout()).apply {
            add(
                JBLabel("Loading tasks...", SwingConstants.CENTER).apply {
                    foreground = foreground.darker()
                },
                BorderLayout.CENTER
            )
        }

        container.add(loadingPanel, "LOADING")
        container.add(JBScrollPane(boardPanel).apply { border = JBUI.Borders.empty() }, "CONTENT")

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

            settings.selectedBoardIds.forEach { boardId ->
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

        boardPanel.removeAll()

        if (tasksByColumn.isEmpty()) {
            val msg = when {
                settings.selectedBoardIds.isEmpty() -> "Select a board in the filters panel."
                searchQuery.isNotBlank() -> "No tasks match \"$searchQuery\"."
                else -> "No tasks found. Adjust your filters."
            }
            boardPanel.layout = BorderLayout()
            boardPanel.add(
                JBLabel(msg, SwingConstants.CENTER).apply {
                    foreground = foreground.darker()
                    border = JBUI.Borders.empty(12)
                },
                BorderLayout.CENTER
            )
        } else {
            boardPanel.layout = GridLayout(1, 0, 10, 0)
            loadedColumns.sortedBy { it.position }.forEach { column ->
                val tasksInColumn = tasksByColumn[column.id] ?: emptyList()
                if (tasksInColumn.isNotEmpty() || column.id in settings.selectedColumnIds) {
                    addColumnPanel(column.name, tasksInColumn)
                }
            }
        }

        boardPanel.revalidate()
        boardPanel.repaint()
    }

    private fun addColumnPanel(columnName: String, tasks: List<Task>) {
        val columnPanel = JPanel().apply {
            layout = BoxLayout(this, BoxLayout.Y_AXIS)
            border = BorderFactory.createTitledBorder(columnName)
        }

        if (tasks.isEmpty()) {
            columnPanel.add(
                JBLabel("Empty", SwingConstants.CENTER).apply {
                    foreground = foreground.darker()
                    alignmentX = Component.CENTER_ALIGNMENT
                    border = JBUI.Borders.empty(8)
                }
            )
        } else {
            tasks.forEach { task ->
                columnPanel.add(createTaskCard(task))
                columnPanel.add(JPanel().apply { maximumSize = Dimension(Int.MAX_VALUE, 4) })
            }
        }

        boardPanel.add(columnPanel)
    }

    private fun createTaskCard(task: Task): JPanel {
        return JPanel(BorderLayout()).apply {
            border = BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(Color.GRAY),
                JBUI.Borders.empty(5)
            )
            maximumSize = Dimension(Int.MAX_VALUE, 80)
            add(
                JBLabel("<html><b>#${task.id}</b><br>${task.title}</html>").apply {
                    border = JBUI.Borders.empty(2)
                },
                BorderLayout.CENTER
            )
        }
    }
}
