package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.api.KaitenApiException
import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.domain.Board
import com.github.scadar.kaitenplugin.domain.Column
import com.github.scadar.kaitenplugin.domain.Space
import com.github.scadar.kaitenplugin.infrastructure.NotificationService
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.awt.Component
import java.awt.Dimension
import java.awt.FlowLayout
import javax.swing.*

class FiltersPanel(private val project: Project, private val scope: CoroutineScope) : JPanel() {
    private val taskService = TaskService.getInstance()
    private val notificationService = NotificationService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val spaceCheckboxes = mutableMapOf<Long, JCheckBox>()
    private val boardCheckboxes = mutableMapOf<Long, JCheckBox>()
    private val columnCheckboxes = mutableMapOf<Long, JCheckBox>()

    private val spacesPanel = JPanel().apply { layout = BoxLayout(this, BoxLayout.Y_AXIS) }
    private val boardsPanel = JPanel().apply { layout = BoxLayout(this, BoxLayout.Y_AXIS) }
    private val columnsPanel = JPanel().apply { layout = BoxLayout(this, BoxLayout.Y_AXIS) }

    private val assigneeCheckbox = JBCheckBox("Assignee", settings.filterByAssignee)
    private val participantCheckbox = JBCheckBox("Participant", settings.filterByParticipant)
    private val andRadio = JRadioButton("AND", settings.filterLogic == "AND")
    private val orRadio = JRadioButton("OR", settings.filterLogic == "OR")

    init {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        border = JBUI.Borders.empty(4, 6, 4, 4)
        setupUI()
        setupListeners()
    }

    private fun setupUI() {
        // --- User filters section ---
        add(sectionLabel("User Filters"))

        val userFilterPanel = JPanel(FlowLayout(FlowLayout.LEFT, 4, 2)).apply {
            alignmentX = Component.LEFT_ALIGNMENT
            maximumSize = Dimension(Int.MAX_VALUE, preferredSize.height)
            add(assigneeCheckbox)
            add(participantCheckbox)
        }
        add(userFilterPanel)

        val logicGroup = ButtonGroup()
        logicGroup.add(andRadio)
        logicGroup.add(orRadio)

        val logicPanel = JPanel(FlowLayout(FlowLayout.LEFT, 4, 2)).apply {
            alignmentX = Component.LEFT_ALIGNMENT
            maximumSize = Dimension(Int.MAX_VALUE, preferredSize.height)
            add(JBLabel("Logic:"))
            add(andRadio)
            add(orRadio)
        }
        add(logicPanel)

        add(Box.createVerticalStrut(8))
        add(separator())

        // --- Spaces section ---
        add(sectionLabel("Spaces"))
        add(scrollPane(spacesPanel, 120))

        add(Box.createVerticalStrut(4))
        add(separator())

        // --- Boards section ---
        add(sectionLabel("Boards"))
        add(scrollPane(boardsPanel, 120))

        add(Box.createVerticalStrut(4))
        add(separator())

        // --- Columns section ---
        add(sectionLabel("Columns"))
        add(scrollPane(columnsPanel, 140))

        add(Box.createVerticalGlue())
    }

    private fun sectionLabel(text: String): JBLabel {
        return JBLabel(text).apply {
            font = font.deriveFont(java.awt.Font.BOLD)
            border = JBUI.Borders.empty(6, 0, 2, 0)
            alignmentX = Component.LEFT_ALIGNMENT
        }
    }

    private fun separator(): JSeparator {
        return JSeparator().apply {
            alignmentX = Component.LEFT_ALIGNMENT
            maximumSize = Dimension(Int.MAX_VALUE, 1)
        }
    }

    private fun scrollPane(content: JPanel, height: Int): JBScrollPane {
        return JBScrollPane(content).apply {
            preferredSize = Dimension(220, height)
            maximumSize = Dimension(Int.MAX_VALUE, height)
            minimumSize = Dimension(100, 60)
            alignmentX = Component.LEFT_ALIGNMENT
            border = JBUI.Borders.empty(2)
        }
    }

    private fun setupListeners() {
        assigneeCheckbox.addActionListener {
            settings.filterByAssignee = assigneeCheckbox.isSelected
        }
        participantCheckbox.addActionListener {
            settings.filterByParticipant = participantCheckbox.isSelected
        }
        andRadio.addActionListener { settings.filterLogic = "AND" }
        orRadio.addActionListener { settings.filterLogic = "OR" }
    }

    fun loadData() {
        if (settings.apiToken.isEmpty()) {
            SwingUtilities.invokeLater {
                showLoadingInPanel(spacesPanel, "Configure API token in Settings")
                showLoadingInPanel(boardsPanel, "")
                showLoadingInPanel(columnsPanel, "")
            }
            notificationService.showWarning(
                project,
                "Configuration Required",
                "Please configure Kaiten Server URL and API Token in Settings > Tools > Kaiten"
            )
            return
        }

        scope.launch {
            try {
                loadSpaces()
            } catch (e: KaitenApiException) {
                notificationService.showApiError(project, e)
            } catch (e: Exception) {
                notificationService.showError(project, "Error Loading Data", e.message ?: "Unknown error occurred")
            }
        }
    }

    private suspend fun loadSpaces() {
        SwingUtilities.invokeLater {
            showLoadingInPanel(spacesPanel, "Loading spaces...")
        }

        val spaces = taskService.getSpaces()

        SwingUtilities.invokeLater {
            spacesPanel.removeAll()
            spaceCheckboxes.clear()

            if (spaces.isEmpty()) {
                spacesPanel.add(checkboxPlaceholder("No spaces found"))
            } else {
                spaces.forEach { space ->
                    val checkbox = JBCheckBox(space.name, space.id in settings.selectedSpaceIds)
                    checkbox.alignmentX = Component.LEFT_ALIGNMENT
                    checkbox.addActionListener { handleSpaceSelection(space, checkbox.isSelected) }
                    spaceCheckboxes[space.id] = checkbox
                    spacesPanel.add(checkbox)
                }
            }

            spacesPanel.revalidate()
            spacesPanel.repaint()
        }

        scope.launch { loadBoardsForSelectedSpaces() }
    }

    private fun handleSpaceSelection(space: Space, selected: Boolean) {
        if (selected) settings.selectedSpaceIds.add(space.id)
        else settings.selectedSpaceIds.remove(space.id)
        scope.launch { loadBoardsForSelectedSpaces() }
    }

    private suspend fun loadBoardsForSelectedSpaces() {
        SwingUtilities.invokeLater {
            showLoadingInPanel(boardsPanel, if (settings.selectedSpaceIds.isEmpty()) "Select a space first" else "Loading boards...")
        }

        val allBoards = mutableListOf<Board>()
        settings.selectedSpaceIds.forEach { spaceId ->
            allBoards.addAll(taskService.getBoards(spaceId))
        }

        SwingUtilities.invokeLater {
            boardsPanel.removeAll()
            boardCheckboxes.clear()

            if (allBoards.isEmpty()) {
                boardsPanel.add(checkboxPlaceholder(if (settings.selectedSpaceIds.isEmpty()) "Select a space first" else "No boards found"))
            } else {
                allBoards.forEach { board ->
                    val checkbox = JBCheckBox(board.name, board.id in settings.selectedBoardIds)
                    checkbox.alignmentX = Component.LEFT_ALIGNMENT
                    checkbox.addActionListener { handleBoardSelection(board, checkbox.isSelected) }
                    boardCheckboxes[board.id] = checkbox
                    boardsPanel.add(checkbox)
                }
            }

            boardsPanel.revalidate()
            boardsPanel.repaint()
        }

        scope.launch { loadColumnsForSelectedBoards() }
    }

    private fun handleBoardSelection(board: Board, selected: Boolean) {
        if (selected) settings.selectedBoardIds.add(board.id)
        else settings.selectedBoardIds.remove(board.id)
        scope.launch { loadColumnsForSelectedBoards() }
    }

    private suspend fun loadColumnsForSelectedBoards() {
        SwingUtilities.invokeLater {
            showLoadingInPanel(columnsPanel, if (settings.selectedBoardIds.isEmpty()) "Select a board first" else "Loading columns...")
        }

        val allColumns = mutableListOf<Column>()
        settings.selectedBoardIds.forEach { boardId ->
            allColumns.addAll(taskService.getColumns(boardId))
        }

        SwingUtilities.invokeLater {
            columnsPanel.removeAll()
            columnCheckboxes.clear()

            if (allColumns.isEmpty()) {
                columnsPanel.add(checkboxPlaceholder(if (settings.selectedBoardIds.isEmpty()) "Select a board first" else "No columns found"))
            } else {
                allColumns.sortedBy { it.position }.forEach { column ->
                    val checkbox = JBCheckBox(column.name, column.id in settings.selectedColumnIds)
                    checkbox.alignmentX = Component.LEFT_ALIGNMENT
                    checkbox.addActionListener { handleColumnSelection(column, checkbox.isSelected) }
                    columnCheckboxes[column.id] = checkbox
                    columnsPanel.add(checkbox)
                }
            }

            columnsPanel.revalidate()
            columnsPanel.repaint()
        }
    }

    private fun handleColumnSelection(column: Column, selected: Boolean) {
        if (selected) settings.selectedColumnIds.add(column.id)
        else settings.selectedColumnIds.remove(column.id)
    }

    private fun showLoadingInPanel(panel: JPanel, message: String) {
        panel.removeAll()
        if (message.isNotEmpty()) {
            panel.add(checkboxPlaceholder(message))
        }
        panel.revalidate()
        panel.repaint()
    }

    private fun checkboxPlaceholder(text: String): JBLabel {
        return JBLabel(text).apply {
            foreground = foreground.darker()
            alignmentX = Component.LEFT_ALIGNMENT
            border = JBUI.Borders.empty(2, 4)
        }
    }
}
