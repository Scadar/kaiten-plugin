package com.github.scadar.kaitenplugin.timetracker

import com.github.scadar.kaitenplugin.domain.TaskTimeEntry
import com.github.scadar.kaitenplugin.infrastructure.TimeEntriesState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import java.time.LocalDate

/**
 * Tracks time spent on Kaiten tasks and persists sessions via [TimeEntriesState].
 *
 * All timing arithmetic is delegated to [TimeTracker] via [AbstractTimeTrackingService];
 * this class only supplies the persistence callback.
 */
@Service(Service.Level.PROJECT)
class TimeTrackingService(project: Project) : AbstractTimeTrackingService<Long>(
    label = "task",
    log = logger<TimeTrackingService>(),
    onPersist = { taskId, durationMs ->
        val entry = TaskTimeEntry(
            taskId          = taskId,
            date            = LocalDate.now(),
            durationSeconds = durationMs / 1000
        )
        TimeEntriesState.getInstance(project).addEntry(entry)
        logger<TimeTrackingService>().info("Saved task entry for task $taskId: ${durationMs / 1000}s")
    }
) {
    companion object {
        fun getInstance(project: Project): TimeTrackingService = project.service()
    }
}
