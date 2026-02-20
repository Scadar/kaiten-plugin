package com.github.scadar.kaitenplugin.timetracker

import com.github.scadar.kaitenplugin.domain.TaskTimeEntry
import com.github.scadar.kaitenplugin.infrastructure.TimeEntriesState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import java.time.LocalDate
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

@Service(Service.Level.PROJECT)
class TimeTrackingService(private val project: Project) {
    private val log = logger<TimeTrackingService>()

    private var currentTaskId: Long? = null
    private var startTime: Long = 0
    private var accumulatedTime: Long = 0
    private val isTracking = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)

    fun startTracking(taskId: Long) {
        if (currentTaskId == taskId && isTracking.get() && !isPaused.get()) {
            log.debug("Already tracking task $taskId")
            return
        }

        // Stop current tracking if any
        if (currentTaskId != null && isTracking.get()) {
            stopTracking()
        }

        currentTaskId = taskId
        startTime = System.currentTimeMillis()
        accumulatedTime = 0
        isTracking.set(true)
        isPaused.set(false)

        log.info("Started tracking task $taskId")
    }

    fun pauseTracking() {
        if (!isTracking.get() || isPaused.get()) {
            return
        }

        val elapsed = System.currentTimeMillis() - startTime
        accumulatedTime += elapsed
        isPaused.set(true)

        log.debug("Paused tracking for task $currentTaskId. Accumulated: ${accumulatedTime}ms")
    }

    fun resumeTracking() {
        if (!isTracking.get() || !isPaused.get()) {
            return
        }

        startTime = System.currentTimeMillis()
        isPaused.set(false)

        log.debug("Resumed tracking for task $currentTaskId")
    }

    fun stopTracking() {
        if (!isTracking.get() || currentTaskId == null) {
            return
        }

        val elapsed = if (!isPaused.get()) {
            System.currentTimeMillis() - startTime
        } else {
            0
        }
        val totalTime = accumulatedTime + elapsed

        if (totalTime > 0) {
            val entry = TaskTimeEntry(
                taskId = currentTaskId!!,
                date = LocalDate.now(),
                durationSeconds = totalTime / 1000
            )

            val state = TimeEntriesState.getInstance(project)
            state.addEntry(entry)

            log.info("Stopped tracking task $currentTaskId. Total time: ${totalTime / 1000}s")
        }

        currentTaskId = null
        startTime = 0
        accumulatedTime = 0
        isTracking.set(false)
        isPaused.set(false)
    }

    fun getCurrentTaskId(): Long? = currentTaskId

    fun isCurrentlyTracking(): Boolean = isTracking.get() && !isPaused.get()

    fun getAccumulatedTime(): Long {
        if (!isTracking.get()) {
            return 0
        }

        val currentTime = if (!isPaused.get()) {
            System.currentTimeMillis() - startTime
        } else {
            0
        }

        return (accumulatedTime + currentTime) / 1000 // Return in seconds
    }

    fun getTimeEntriesForTask(taskId: Long): List<TaskTimeEntry> {
        val state = TimeEntriesState.getInstance(project)
        return state.getEntriesByTask(taskId)
    }

    fun getTotalTimeForTask(taskId: Long): Long {
        return getTimeEntriesForTask(taskId).sumOf { it.durationSeconds }
    }

    companion object {
        fun getInstance(project: Project): TimeTrackingService = project.service()
    }
}
