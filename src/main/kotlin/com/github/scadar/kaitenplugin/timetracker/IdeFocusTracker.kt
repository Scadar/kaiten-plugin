package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.WindowManager
import java.awt.event.WindowEvent
import java.awt.event.WindowFocusListener
import javax.swing.SwingUtilities

@Service(Service.Level.PROJECT)
class IdeFocusTracker(private val project: Project) {
    private val log = logger<IdeFocusTracker>()
    private val timeTrackingService = TimeTrackingService.getInstance(project)
    private var isInFocus = false

    private val focusListener = object : WindowFocusListener {
        override fun windowGainedFocus(e: WindowEvent?) {
            log.debug("IDE gained focus")
            isInFocus = true
            handleFocusGained()
        }

        override fun windowLostFocus(e: WindowEvent?) {
            log.debug("IDE lost focus")
            isInFocus = false
            handleFocusLost()
        }
    }

    fun initialize() {
        SwingUtilities.invokeLater {
            val frame = WindowManager.getInstance().getFrame(project)
            frame?.addWindowFocusListener(focusListener)
            isInFocus = frame?.isFocused ?: false
            log.info("IdeFocusTracker initialized. Initial focus state: $isInFocus")
        }
    }

    fun dispose() {
        SwingUtilities.invokeLater {
            val frame = WindowManager.getInstance().getFrame(project)
            frame?.removeWindowFocusListener(focusListener)
            log.info("IdeFocusTracker disposed")
        }
    }

    private fun handleFocusGained() {
        val taskId = GitBranchListener.getCurrentTaskId(project)
        if (taskId != null) {
            timeTrackingService.resumeTracking()
            // If not tracking yet, start tracking
            if (!timeTrackingService.isCurrentlyTracking()) {
                timeTrackingService.startTracking(taskId)
            }
        }
    }

    private fun handleFocusLost() {
        if (timeTrackingService.isCurrentlyTracking()) {
            timeTrackingService.pauseTracking()
        }
    }

    fun isIdeInFocus(): Boolean = isInFocus

    companion object {
        fun getInstance(project: Project): IdeFocusTracker = project.service()
    }
}
