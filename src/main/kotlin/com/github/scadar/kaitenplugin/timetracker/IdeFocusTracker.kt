package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.Disposable
import com.intellij.openapi.wm.WindowManager
import java.awt.event.WindowEvent
import java.awt.event.WindowFocusListener
import javax.swing.SwingUtilities

@Service(Service.Level.PROJECT)
class IdeFocusTracker(private val project: Project) : Disposable {
    private val log = logger<IdeFocusTracker>()

    // Lazy to avoid circular service initialisation and allow easier testing.
    private val timeTrackingService by lazy { TimeTrackingService.getInstance(project) }
    private val branchTimeTrackingService by lazy { BranchTimeTrackingService.getInstance(project) }

    // FIX: @Volatile ensures writes from EDT (WindowFocusListener) are immediately
    // visible to background threads that call isIdeInFocus() — specifically
    // GitBranchListener.repositoryChanged(), which runs on git4idea's background thread.
    @Volatile
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

    override fun dispose() {
        SwingUtilities.invokeLater {
            WindowManager.getInstance().getFrame(project)?.removeWindowFocusListener(focusListener)
            log.info("IdeFocusTracker disposed")
        }
    }

    private fun handleFocusGained() {
        // Resume/start task-level tracking
        val taskId = GitBranchListener.getCurrentTaskId(project)
        if (taskId != null) {
            timeTrackingService.resumeTracking()
            if (!timeTrackingService.isCurrentlyTracking()) {
                timeTrackingService.startTracking(taskId)
            }
        }

        // Resume/start branch-level tracking
        val branchName = GitBranchListener.getCurrentBranchName(project)
        if (branchName != null) {
            branchTimeTrackingService.resumeTracking()
            if (!branchTimeTrackingService.isCurrentlyTracking()) {
                branchTimeTrackingService.startTracking(branchName)
            }
        }
    }

    private fun handleFocusLost() {
        if (timeTrackingService.isCurrentlyTracking()) {
            timeTrackingService.pauseTracking()
        }
        if (branchTimeTrackingService.isCurrentlyTracking()) {
            branchTimeTrackingService.pauseTracking()
        }
    }

    fun isIdeInFocus(): Boolean = isInFocus

    companion object {
        fun getInstance(project: Project): IdeFocusTracker = project.service()
    }
}
