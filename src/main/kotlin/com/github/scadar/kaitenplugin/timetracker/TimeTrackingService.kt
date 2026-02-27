package com.github.scadar.kaitenplugin.timetracker

import com.github.scadar.kaitenplugin.domain.TaskTimeEntry
import com.github.scadar.kaitenplugin.infrastructure.TimeEntriesState
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import java.time.LocalDate

private const val CHECKPOINT_INTERVAL_MS = 60_000L

/**
 * Tracks time spent on Kaiten tasks and persists sessions via [TimeEntriesState].
 *
 * All timing arithmetic is delegated to [TimeTracker]; this class only handles
 * task-ID identity and persistence.
 *
 * ### Persistence guarantees
 * - **Periodic checkpoint** every [CHECKPOINT_INTERVAL_MS]: saves the delta accumulated
 *   since the previous checkpoint so at most one interval of data is lost on a crash.
 * - **On project close** ([dispose]): the remaining delta is saved before the service shuts down.
 */
@Service(Service.Level.PROJECT)
class TimeTrackingService(private val project: Project) : Disposable {

    private val log = logger<TimeTrackingService>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val tracker = TimeTracker<Long>("task", log) { taskId, durationMs ->
        val entry = TaskTimeEntry(
            taskId          = taskId,
            date            = LocalDate.now(),
            durationSeconds = durationMs / 1000
        )
        TimeEntriesState.getInstance(project).addEntry(entry)
        log.info("Saved task entry for task $taskId: ${durationMs / 1000}s")
    }

    init {
        scope.launch {
            while (isActive) {
                delay(CHECKPOINT_INTERVAL_MS)
                tracker.checkpoint()
            }
        }
    }

    fun startTracking(taskId: Long) = tracker.startTracking(taskId)
    fun pauseTracking()             = tracker.pauseTracking()
    fun resumeTracking()            = tracker.resumeTracking()
    fun stopTracking()              = tracker.stopTracking()

    fun isCurrentlyTracking(): Boolean = tracker.isActive()

    override fun dispose() {
        scope.cancel()
        tracker.stopTracking()   // saves the remaining delta before shutdown
        log.info("TimeTrackingService disposed — active session saved")
    }

    companion object {
        fun getInstance(project: Project): TimeTrackingService = project.service()
    }
}
