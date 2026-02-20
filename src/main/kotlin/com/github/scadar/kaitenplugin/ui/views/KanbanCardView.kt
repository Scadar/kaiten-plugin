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
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.awt.*
import javax.swing.BorderFactory
import javax.swing.BoxLayout
import javax.swing.JPanel
import javax.swing.SwingUtilities

class KanbanCardView(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val userService = UserService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val boardPanel = JPanel()

    init {
        setupUI()
        refreshTasks()
    }

    private fun setupUI() {
        boardPanel.layout = GridLayout(1, 0, 10, 0)
        add(JBScrollPane(boardPanel), BorderLayout.CENTER)
    }

    fun refreshTasks() {
        scope.launch {
            val allTasks = mutableListOf<Task>()
            val allColumns = mutableListOf<Column>()

            // Load tasks from all selected boards
            settings.selectedBoardIds.forEach { boardId ->
                allTasks.addAll(taskService.getTasks(boardId))
                allColumns.addAll(taskService.getColumns(boardId))
            }

            // Get current user
            val currentUser = userService.getCurrentUser()

            // Apply filters
            val filteredTasks = filterService.filterTasks(
                tasks = allTasks,
                currentUser = currentUser,
                selectedColumnIds = settings.selectedColumnIds,
                filterByAssignee = settings.filterByAssignee,
                filterByParticipant = settings.filterByParticipant,
                filterLogic = settings.filterLogic
            )

            // Group tasks by column
            val tasksByColumn = filteredTasks.groupBy { it.columnId }

            SwingUtilities.invokeLater {
                boardPanel.removeAll()

                if (tasksByColumn.isEmpty()) {
                    val emptyLabel = JBLabel("No tasks found. Please adjust your filters.")
                    boardPanel.add(emptyLabel)
                } else {
                    allColumns.sortedBy { it.position }.forEach { column ->
                        val tasksInColumn = tasksByColumn[column.id] ?: emptyList()
                        if (tasksInColumn.isNotEmpty() || column.id in settings.selectedColumnIds) {
                            addColumnPanel(column.name, tasksInColumn)
                        }
                    }
                }

                boardPanel.revalidate()
                boardPanel.repaint()
            }
        }
    }

    private fun addColumnPanel(columnName: String, tasks: List<Task>) {
        val columnPanel = JPanel()
        columnPanel.layout = BoxLayout(columnPanel, BoxLayout.Y_AXIS)
        columnPanel.border = BorderFactory.createTitledBorder(columnName)

        tasks.forEach { task ->
            val cardPanel = createTaskCard(task)
            columnPanel.add(cardPanel)
        }

        boardPanel.add(columnPanel)
    }

    private fun createTaskCard(task: Task): JPanel {
        val cardPanel = JPanel(BorderLayout())
        cardPanel.border = BorderFactory.createCompoundBorder(
            BorderFactory.createLineBorder(Color.GRAY),
            BorderFactory.createEmptyBorder(5, 5, 5, 5)
        )
        cardPanel.maximumSize = Dimension(200, 100)

        val titleLabel = JBLabel("<html><b>#${task.id}</b><br>${task.title}</html>")
        cardPanel.add(titleLabel, BorderLayout.CENTER)

        return cardPanel
    }
}
