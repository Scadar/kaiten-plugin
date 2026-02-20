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
import java.awt.BorderLayout
import java.awt.Font
import javax.swing.BoxLayout
import javax.swing.JPanel
import javax.swing.SwingUtilities

class TaskListView(private val project: Project) : JPanel(BorderLayout()) {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val taskService = TaskService.getInstance()
    private val filterService = FilterService.getInstance()
    private val userService = UserService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val contentPanel = JPanel()

    init {
        setupUI()
        refreshTasks()
    }

    private fun setupUI() {
        contentPanel.layout = BoxLayout(contentPanel, BoxLayout.Y_AXIS)
        add(JBScrollPane(contentPanel), BorderLayout.CENTER)
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
                contentPanel.removeAll()

                if (tasksByColumn.isEmpty()) {
                    val emptyLabel = JBLabel("No tasks found. Please adjust your filters.")
                    contentPanel.add(emptyLabel)
                } else {
                    allColumns.sortedBy { it.position }.forEach { column ->
                        val tasksInColumn = tasksByColumn[column.id] ?: emptyList()
                        if (tasksInColumn.isNotEmpty()) {
                            addColumnSection(column.name, tasksInColumn)
                        }
                    }
                }

                contentPanel.revalidate()
                contentPanel.repaint()
            }
        }
    }

    private fun addColumnSection(columnName: String, tasks: List<Task>) {
        val columnLabel = JBLabel(columnName)
        columnLabel.font = columnLabel.font.deriveFont(Font.BOLD, 14f)
        contentPanel.add(columnLabel)

        tasks.forEach { task ->
            val taskPanel = JPanel(BorderLayout())
            taskPanel.add(JBLabel("  [#${task.id}] ${task.title}"), BorderLayout.WEST)
            contentPanel.add(taskPanel)
        }

        contentPanel.add(JPanel()) // Spacing
    }
}
