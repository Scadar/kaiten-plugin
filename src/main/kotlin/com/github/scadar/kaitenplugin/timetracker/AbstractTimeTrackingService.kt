package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.Disposable
import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.*

private const val CHECKPOINT_INTERVAL_MS = 60_000L

/**
 * Base class for time-tracking services that share the same lifecycle pattern:
 * - Delegate timing to [TimeTracker]
 * - Periodic checkpoint every 60 seconds
 * - Save remaining delta on [dispose]
 *
 * @param ID    Identifier type (e.g. [Long] for task IDs, [String] for branch names).
 * @param label Human-readable label for log messages (e.g. "task", "branch").
 * @param log   Logger from the concrete service.
 * @param onPersist Called with (id, durationMs) to persist a time delta.
 */
abstract class AbstractTimeTrackingService<ID>(
    label: String,
    protected val log: Logger,
    onPersist: (id: ID, durationMs: Long) -> Unit,
) : Disposable {

    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    protected val tracker = TimeTracker<ID>(label, log, onPersist)

    init {
        scope.launch {
            while (isActive) {
                delay(CHECKPOINT_INTERVAL_MS)
                tracker.checkpoint()
            }
        }
    }

    fun startTracking(id: ID) = tracker.startTracking(id)
    fun pauseTracking()       = tracker.pauseTracking()
    fun resumeTracking()      = tracker.resumeTracking()
    fun stopTracking()        = tracker.stopTracking()

    fun isCurrentlyTracking(): Boolean = tracker.isActive()

    override fun dispose() {
        scope.cancel()
        tracker.stopTracking()
        log.info("${this::class.simpleName} disposed — active session saved")
    }
}
