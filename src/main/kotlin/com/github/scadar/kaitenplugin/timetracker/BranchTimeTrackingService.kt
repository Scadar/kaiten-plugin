package com.github.scadar.kaitenplugin.timetracker

import com.github.scadar.kaitenplugin.domain.BranchTimeEntry
import com.github.scadar.kaitenplugin.infrastructure.BranchTimeEntriesState
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import kotlinx.coroutines.*
import java.time.LocalDate

private const val CHECKPOINT_INTERVAL_MS = 60_000L

/**
 * Tracks time spent on git branches and persists sessions via [BranchTimeEntriesState].
 *
 * All timing arithmetic is delegated to [TimeTracker]; this class only handles
 * branch-name identity and persistence.
 *
 * ### Persistence guarantees
 * - **Periodic checkpoint** every [CHECKPOINT_INTERVAL_MS]: saves the delta accumulated
 *   since the previous checkpoint so at most one interval of data is lost on a crash.
 * - **On project close** ([dispose]): the remaining delta is saved before the service shuts down.
 */
@Service(Service.Level.PROJECT)
class BranchTimeTrackingService(private val project: Project) : Disposable {

    private val log = logger<BranchTimeTrackingService>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    private val tracker = TimeTracker<String>("branch", log) { branch, durationMs ->
        val entry = BranchTimeEntry(
            branchName      = branch,
            date            = LocalDate.now(),
            durationSeconds = durationMs / 1000
        )
        BranchTimeEntriesState.getInstance(project).addEntry(entry)
        log.info("Saved branch entry for '$branch': ${durationMs / 1000}s")
    }

    init {
        scope.launch {
            while (isActive) {
                delay(CHECKPOINT_INTERVAL_MS)
                tracker.checkpoint()
            }
        }
    }

    fun startTracking(branchName: String) = tracker.startTracking(branchName)
    fun pauseTracking()                   = tracker.pauseTracking()
    fun resumeTracking()                  = tracker.resumeTracking()
    fun stopTracking()                    = tracker.stopTracking()

    fun getCurrentBranch(): String?    = tracker.currentId
    fun isCurrentlyTracking(): Boolean = tracker.isActive()
    fun getAccumulatedSeconds(): Long  = tracker.getAccumulatedSeconds()
    fun getUnpersistedSeconds(): Long  = tracker.getUnpersistedSeconds()

    override fun dispose() {
        scope.cancel()
        tracker.stopTracking()   // saves the remaining delta before shutdown
        log.info("BranchTimeTrackingService disposed — active session saved")
    }

    companion object {
        fun getInstance(project: Project): BranchTimeTrackingService = project.service()
    }
}
