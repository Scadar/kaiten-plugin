package com.github.scadar.kaitenplugin.timetracker

import com.github.scadar.kaitenplugin.domain.BranchTimeEntry
import com.github.scadar.kaitenplugin.infrastructure.BranchTimeEntriesState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import java.time.LocalDate

/**
 * Tracks time spent on git branches and persists sessions via [BranchTimeEntriesState].
 *
 * All timing arithmetic is delegated to [TimeTracker] via [AbstractTimeTrackingService];
 * this class only supplies the persistence callback and branch-specific accessors.
 */
@Service(Service.Level.PROJECT)
class BranchTimeTrackingService(project: Project) : AbstractTimeTrackingService<String>(
    label = "branch",
    log = logger<BranchTimeTrackingService>(),
    onPersist = { branch, durationMs ->
        val entry = BranchTimeEntry(
            branchName      = branch,
            date            = LocalDate.now(),
            durationSeconds = durationMs / 1000
        )
        BranchTimeEntriesState.getInstance(project).addEntry(entry)
        logger<BranchTimeTrackingService>().info("Saved branch entry for '$branch': ${durationMs / 1000}s")
    }
) {
    fun getCurrentBranch(): String?    = tracker.currentId
    fun getAccumulatedSeconds(): Long  = tracker.getAccumulatedSeconds()
    fun getUnpersistedSeconds(): Long  = tracker.getUnpersistedSeconds()

    companion object {
        fun getInstance(project: Project): BranchTimeTrackingService = project.service()
    }
}
