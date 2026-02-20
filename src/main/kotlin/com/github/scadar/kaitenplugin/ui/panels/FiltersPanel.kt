package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.api.KaitenApiException
import com.github.scadar.kaitenplugin.application.TaskService
import com.github.scadar.kaitenplugin.domain.Board
import com.github.scadar.kaitenplugin.domain.Column
import com.github.scadar.kaitenplugin.domain.Space
import com.github.scadar.kaitenplugin.infrastructure.NotificationService
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.ui.CheckBoxList
import com.intellij.ui.SimpleListCellRenderer
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.awt.*
import java.awt.event.ItemEvent
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.*
import javax.swing.SwingUtilities

class FiltersPanel(private val project: Project, private val scope: CoroutineScope) : JPanel() {
    private val taskService = TaskService.getInstance()
    private val notificationService = NotificationService.getInstance()
    private val settings = KaitenSettingsState.getInstance()

    // --- JetBrains components ---
    private val spaceCombo = ComboBox<Space?>()
    private val boardCombo = ComboBox<Board?>()
    private val columnsList = CheckBoxList<Column>()

    private val assigneeCheckbox = JBCheckBox("Assignee", settings.filterByAssignee)
    private val participantCheckbox = JBCheckBox("Participant", settings.filterByParticipant)
    private val andRadio = JRadioButton("AND", settings.filterLogic == "AND")
    private val orRadio = JRadioButton("OR", settings.filterLogic == "OR")

    // Guard to prevent listener feedback loops during programmatic updates
    private var updatingCombos = false

    init {
        layout = BoxLayout(this, BoxLayout.Y_AXIS)
        border = JBUI.Borders.empty(4, 6, 4, 6)
        configureComponents()
        buildUI()
        wireListeners()
    }

    // -------------------------------------------------------------------------
    // Setup
    // -------------------------------------------------------------------------

    private fun configureComponents() {
        // ComboBox renderers: show placeholder when item == null
        spaceCombo.renderer = SimpleListCellRenderer.create<Space?>("-- Select space --") { it?.name ?: "" }
        boardCombo.renderer = SimpleListCellRenderer.create<Board?>("-- Select board --") { it?.name ?: "" }

        // Stretch combos to panel width
        spaceCombo.alignmentX = Component.LEFT_ALIGNMENT
        boardCombo.alignmentX = Component.LEFT_ALIGNMENT
        spaceCombo.maximumSize = Dimension(Int.MAX_VALUE, spaceCombo.preferredSize.height + 4)
        boardCombo.maximumSize = Dimension(Int.MAX_VALUE, boardCombo.preferredSize.height + 4)

        // Start disabled until data is loaded
        spaceCombo.isEnabled = false
        boardCombo.isEnabled = false
        columnsList.isEnabled = false
    }

    private fun buildUI() {
        // Space
        add(sectionLabel("Space"))
        add(spaceCombo)
        add(Box.createVerticalStrut(8))

        // Board
        add(sectionLabel("Board"))
        add(boardCombo)
        add(Box.createVerticalStrut(8))

        // Columns
        add(sectionLabel("Columns"))
        add(
            JBScrollPane(columnsList).apply {
                preferredSize = Dimension(220, 160)
                maximumSize = Dimension(Int.MAX_VALUE, 160)
                minimumSize = Dimension(100, 80)
                alignmentX = Component.LEFT_ALIGNMENT
                border = JBUI.Borders.customLine(
                    UIManager.getColor("Component.borderColor") ?: Color.GRAY, 1
                )
            }
        )

        add(Box.createVerticalStrut(10))
        add(hsep())
        add(Box.createVerticalStrut(6))

        // User filter
        add(sectionLabel("User Filter"))
        add(
            row(assigneeCheckbox, participantCheckbox)
        )

        // Filter logic
        val logicGroup = ButtonGroup().also { it.add(andRadio); it.add(orRadio) }
        add(
            row(JBLabel("Logic:"), andRadio, orRadio)
        )

        add(Box.createVerticalGlue())
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun sectionLabel(text: String) = JBLabel(text).apply {
        font = font.deriveFont(Font.BOLD)
        border = JBUI.Borders.empty(2, 0, 2, 0)
        alignmentX = Component.LEFT_ALIGNMENT
    }

    private fun hsep() = JSeparator().apply {
        alignmentX = Component.LEFT_ALIGNMENT
        maximumSize = Dimension(Int.MAX_VALUE, 1)
    }

    private fun row(vararg components: JComponent): JPanel {
        return JPanel(FlowLayout(FlowLayout.LEFT, 4, 0)).apply {
            alignmentX = Component.LEFT_ALIGNMENT
            maximumSize = Dimension(Int.MAX_VALUE, preferredSize.height + 4)
            components.forEach { add(it) }
        }
    }

    // -------------------------------------------------------------------------
    // Listeners
    // -------------------------------------------------------------------------

    private fun wireListeners() {
        spaceCombo.addItemListener { event ->
            if (event.stateChange == ItemEvent.SELECTED && !updatingCombos) {
                val space = spaceCombo.selectedItem as? Space
                settings.selectedSpaceId = space?.id
                settings.selectedBoardId = null
                settings.selectedColumnIds.clear()
                scope.launch { loadBoards(space?.id) }
            }
        }

        boardCombo.addItemListener { event ->
            if (event.stateChange == ItemEvent.SELECTED && !updatingCombos) {
                val board = boardCombo.selectedItem as? Board
                settings.selectedBoardId = board?.id
                settings.selectedColumnIds.clear()
                scope.launch { loadColumns(board?.id) }
            }
        }

        // CheckBoxList toggles the checkbox in processMouseEvent (before external listeners fire),
        // so mouseClicked sees the already-updated state via the model.
        columnsList.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (!SwingUtilities.isLeftMouseButton(e)) return
                val index = columnsList.locationToIndex(e.point)
                if (index < 0) return
                val column = columnsList.getItemAt(index) ?: return
                val jcb = columnsList.model.getElementAt(index)
                if (jcb.isSelected) settings.selectedColumnIds.add(column.id)
                else settings.selectedColumnIds.remove(column.id)
            }
        })

        assigneeCheckbox.addActionListener { settings.filterByAssignee = assigneeCheckbox.isSelected }
        participantCheckbox.addActionListener { settings.filterByParticipant = participantCheckbox.isSelected }
        andRadio.addActionListener { settings.filterLogic = "AND" }
        orRadio.addActionListener { settings.filterLogic = "OR" }
    }

    // -------------------------------------------------------------------------
    // Data loading
    // -------------------------------------------------------------------------

    fun loadData() {
        if (settings.apiToken.isEmpty()) {
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
                notificationService.showError(project, "Error Loading Filters", e.message ?: "Unknown error")
            }
        }
    }

    private suspend fun loadSpaces() {
        SwingUtilities.invokeLater {
            updatingCombos = true
            spaceCombo.removeAllItems()
            spaceCombo.addItem(null)
            spaceCombo.isEnabled = false
            updatingCombos = false
        }

        val spaces = taskService.getSpaces()

        SwingUtilities.invokeLater {
            updatingCombos = true
            spaceCombo.removeAllItems()
            spaceCombo.addItem(null)
            spaces.forEach { spaceCombo.addItem(it) }

            // Restore saved selection
            val savedId = settings.selectedSpaceId
            spaceCombo.selectedItem = spaces.find { it.id == savedId }
            spaceCombo.isEnabled = spaces.isNotEmpty()
            updatingCombos = false
        }

        // Load boards for the already-saved space (no event fired above due to guard)
        loadBoards(settings.selectedSpaceId)
    }

    private suspend fun loadBoards(spaceId: Long?) {
        SwingUtilities.invokeLater {
            updatingCombos = true
            boardCombo.removeAllItems()
            boardCombo.addItem(null)
            boardCombo.isEnabled = false
            updatingCombos = false
            columnsList.setItems(emptyList()) { it.name }
            columnsList.isEnabled = false
        }

        if (spaceId == null) return

        val boards = taskService.getBoards(spaceId)

        SwingUtilities.invokeLater {
            updatingCombos = true
            boardCombo.removeAllItems()
            boardCombo.addItem(null)
            boards.forEach { boardCombo.addItem(it) }

            val savedId = settings.selectedBoardId
            boardCombo.selectedItem = boards.find { it.id == savedId }
            boardCombo.isEnabled = boards.isNotEmpty()
            updatingCombos = false
        }

        // Load columns for the already-saved board
        loadColumns(settings.selectedBoardId)
    }

    private suspend fun loadColumns(boardId: Long?) {
        SwingUtilities.invokeLater {
            columnsList.setItems(emptyList()) { it.name }
            columnsList.isEnabled = false
        }

        if (boardId == null) return

        val columns = taskService.getColumns(boardId).sortedBy { it.position }

        SwingUtilities.invokeLater {
            columnsList.setItems(columns) { it.name }
            // Restore saved selections
            columns.forEach { col ->
                columnsList.setItemSelected(col, col.id in settings.selectedColumnIds)
            }
            columnsList.isEnabled = columns.isNotEmpty()
        }
    }
}
