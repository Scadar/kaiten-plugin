package com.github.scadar.kaitenplugin.ui.panels

import com.github.scadar.kaitenplugin.infrastructure.TimeEntriesState
import com.github.scadar.kaitenplugin.timetracker.TimeTrackingService
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.table.JBTable
import java.awt.BorderLayout
import javax.swing.JPanel
import javax.swing.table.DefaultTableModel

class StatisticsPanel(private val project: Project) : JPanel(BorderLayout()) {
    private val timeTrackingService = TimeTrackingService.getInstance(project)
    private val timeEntriesState = TimeEntriesState.getInstance(project)

    private val tableModel = DefaultTableModel(
        arrayOf("Task ID", "Total Time (hours)", "Total Time (seconds)"),
        0
    )
    private val table = JBTable(tableModel)

    init {
        setupUI()
    }

    private fun setupUI() {
        add(JBLabel("Time Tracking Statistics"), BorderLayout.NORTH)
        add(JBScrollPane(table), BorderLayout.CENTER)

        refreshStatistics()
    }

    fun refreshStatistics() {
        tableModel.rowCount = 0

        val allEntries = timeEntriesState.getAllEntries()

        allEntries.forEach { (taskId, entries) ->
            val totalSeconds = entries.sumOf { it.durationSeconds }
            val totalHours = String.format("%.2f", totalSeconds / 3600.0)

            tableModel.addRow(arrayOf(taskId.toString(), totalHours, totalSeconds.toString()))
        }

        // Add current tracking task if any
        val currentTaskId = timeTrackingService.getCurrentTaskId()
        if (currentTaskId != null) {
            val currentTime = timeTrackingService.getAccumulatedTime()
            val existingRow = (0 until tableModel.rowCount).find {
                tableModel.getValueAt(it, 0).toString() == currentTaskId.toString()
            }

            if (existingRow != null) {
                val existingSeconds = tableModel.getValueAt(existingRow, 2).toString().toLong()
                val totalSeconds = existingSeconds + currentTime
                val totalHours = String.format("%.2f", totalSeconds / 3600.0)
                tableModel.setValueAt(totalHours, existingRow, 1)
                tableModel.setValueAt(totalSeconds.toString(), existingRow, 2)
            } else {
                val totalHours = String.format("%.2f", currentTime / 3600.0)
                tableModel.addRow(arrayOf(currentTaskId.toString(), totalHours, currentTime.toString()))
            }
        }

        table.revalidate()
        table.repaint()
    }
}
