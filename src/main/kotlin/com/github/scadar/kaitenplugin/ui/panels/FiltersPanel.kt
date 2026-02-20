package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.domain.Board
import com.github.scadar.kaitenplugin.domain.Column
import com.github.scadar.kaitenplugin.domain.Space
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.awt.FlowLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import javax.swing.*

class FiltersPanel(private val project: Project, private val scope: CoroutineScope) : JPanel(GridBagLayout()) {
    private val taskService = TaskService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    private val spaceCheckboxes = mutableMapOf<Long, JCheckBox>()
    private val boardCheckboxes = mutableMapOf<Long, JCheckBox>()
    private val columnCheckboxes = mutableMapOf<Long, JCheckBox>()

    private val spacesPanel = JPanel()
    private val boardsPanel = JPanel()
    private val columnsPanel = JPanel()

    private val assigneeCheckbox = JBCheckBox("Filter by Assignee", settings.filterByAssignee)
    private val participantCheckbox = JBCheckBox("Filter by Participant", settings.filterByParticipant)
    private val andRadio = JRadioButton("AND", settings.filterLogic == "AND")
    private val orRadio = JRadioButton("OR", settings.filterLogic == "OR")

    init {
        setupUI()
        setupListeners()
    }

    private fun setupUI() {
        val gbc = GridBagConstraints()
        gbc.fill = GridBagConstraints.HORIZONTAL
        gbc.weightx = 1.0
        gbc.gridx = 0

        // User filter options
        gbc.gridy = 0
        val userFilterPanel = JPanel(FlowLayout(FlowLayout.LEFT))
        userFilterPanel.add(JBLabel("User Filters: "))
        userFilterPanel.add(assigneeCheckbox)
        userFilterPanel.add(participantCheckbox)

        val logicGroup = ButtonGroup()
        logicGroup.add(andRadio)
        logicGroup.add(orRadio)
        userFilterPanel.add(JBLabel(" Logic: "))
        userFilterPanel.add(andRadio)
        userFilterPanel.add(orRadio)

        add(userFilterPanel, gbc)

        // Spaces filter
        gbc.gridy = 1
        add(JBLabel("Spaces:"), gbc)
        gbc.gridy = 2
        spacesPanel.layout = BoxLayout(spacesPanel, BoxLayout.Y_AXIS)
        add(JBScrollPane(spacesPanel), gbc)

        // Boards filter
        gbc.gridy = 3
        add(JBLabel("Boards:"), gbc)
        gbc.gridy = 4
        boardsPanel.layout = BoxLayout(boardsPanel, BoxLayout.Y_AXIS)
        add(JBScrollPane(boardsPanel), gbc)

        // Columns filter
        gbc.gridy = 5
        add(JBLabel("Columns:"), gbc)
        gbc.gridy = 6
        columnsPanel.layout = BoxLayout(columnsPanel, BoxLayout.Y_AXIS)
        add(JBScrollPane(columnsPanel), gbc)
    }

    private fun setupListeners() {
        assigneeCheckbox.addActionListener {
            settings.filterByAssignee = assigneeCheckbox.isSelected
        }

        participantCheckbox.addActionListener {
            settings.filterByParticipant = participantCheckbox.isSelected
        }

        andRadio.addActionListener {
            settings.filterLogic = "AND"
        }

        orRadio.addActionListener {
            settings.filterLogic = "OR"
        }
    }

    fun loadData() {
        scope.launch {
            loadSpaces()
        }
    }

    private suspend fun loadSpaces() {
        val spaces = taskService.getSpaces()
        SwingUtilities.invokeLater {
            spacesPanel.removeAll()
            spaceCheckboxes.clear()

            spaces.forEach { space ->
                val checkbox = JBCheckBox(space.name, space.id in settings.selectedSpaceIds)
                checkbox.addActionListener {
                    handleSpaceSelection(space, checkbox.isSelected)
                }
                spaceCheckboxes[space.id] = checkbox
                spacesPanel.add(checkbox)
            }

            spacesPanel.revalidate()
            spacesPanel.repaint()
        }

        // Load boards for selected spaces
        scope.launch {
            loadBoardsForSelectedSpaces()
        }
    }

    private fun handleSpaceSelection(space: Space, selected: Boolean) {
        if (selected) {
            settings.selectedSpaceIds.add(space.id)
        } else {
            settings.selectedSpaceIds.remove(space.id)
        }

        scope.launch {
            loadBoardsForSelectedSpaces()
        }
    }

    private suspend fun loadBoardsForSelectedSpaces() {
        val allBoards = mutableListOf<Board>()
        settings.selectedSpaceIds.forEach { spaceId ->
            allBoards.addAll(taskService.getBoards(spaceId))
        }

        SwingUtilities.invokeLater {
            boardsPanel.removeAll()
            boardCheckboxes.clear()

            allBoards.forEach { board ->
                val checkbox = JBCheckBox(board.name, board.id in settings.selectedBoardIds)
                checkbox.addActionListener {
                    handleBoardSelection(board, checkbox.isSelected)
                }
                boardCheckboxes[board.id] = checkbox
                boardsPanel.add(checkbox)
            }

            boardsPanel.revalidate()
            boardsPanel.repaint()
        }

        // Load columns for selected boards
        scope.launch {
            loadColumnsForSelectedBoards()
        }
    }

    private fun handleBoardSelection(board: Board, selected: Boolean) {
        if (selected) {
            settings.selectedBoardIds.add(board.id)
        } else {
            settings.selectedBoardIds.remove(board.id)
        }

        scope.launch {
            loadColumnsForSelectedBoards()
        }
    }

    private suspend fun loadColumnsForSelectedBoards() {
        val allColumns = mutableListOf<Column>()
        settings.selectedBoardIds.forEach { boardId ->
            allColumns.addAll(taskService.getColumns(boardId))
        }

        SwingUtilities.invokeLater {
            columnsPanel.removeAll()
            columnCheckboxes.clear()

            allColumns.sortedBy { it.position }.forEach { column ->
                val checkbox = JBCheckBox(column.name, column.id in settings.selectedColumnIds)
                checkbox.addActionListener {
                    handleColumnSelection(column, checkbox.isSelected)
                }
                columnCheckboxes[column.id] = checkbox
                columnsPanel.add(checkbox)
            }

            columnsPanel.revalidate()
            columnsPanel.repaint()
        }
    }

    private fun handleColumnSelection(column: Column, selected: Boolean) {
        if (selected) {
            settings.selectedColumnIds.add(column.id)
        } else {
            settings.selectedColumnIds.remove(column.id)
        }
    }
}
