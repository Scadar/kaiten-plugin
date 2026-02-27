package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.diagnostic.Logger

/**
 * Generic time-tracking state machine shared by [TimeTrackingService] and [BranchTimeTrackingService].
 *
 * Delegates session arithmetic to [TrackingSession] and calls [onStop] when a session ends
 * or is checkpointed with non-zero duration.
 *
 * ### Persistence strategy
 * [onStop] is called both on explicit [stopTracking] and on each periodic [checkpoint].
 * Each call passes only the **delta** since the last checkpoint (or since session start
 * for the very first call), so time is never double-counted across entries.
 *
 * This guarantees at most one checkpoint interval of data is lost on an unexpected
 * process termination, and nothing is lost on a graceful [stopTracking].
 *
 * @param ID          Identifier type (e.g. [Long] for task IDs, [String] for branch names).
 * @param entityLabel Human-readable label used in log messages (e.g. "task", "branch").
 * @param log         Logger from the owning service — keeps log context meaningful.
 * @param onStop      Called with (id, deltaMs) on [checkpoint] or [stopTracking].
 */
class TimeTracker<ID>(
    private val entityLabel: String,
    private val log: Logger,
    private val onStop: (id: ID, durationMs: Long) -> Unit
) {
    private val session = TrackingSession()

    @Volatile
    var currentId: ID? = null
        private set

    /** Milliseconds already persisted by previous [checkpoint] calls for the current session. */
    @Volatile
    private var checkpointedMs: Long = 0L

    /** True when a session has been started (regardless of pause state). */
    val isTracking: Boolean get() = session.isTracking

    fun startTracking(id: ID) = synchronized(this) {
        if (currentId == id && session.isActive()) {
            log.debug("Already tracking $entityLabel '$id'")
            return@synchronized
        }
        if (currentId != null && session.isTracking) {
            stopTrackingInternal()
        }
        currentId = id
        session.start()
        log.info("Started tracking $entityLabel '$id'")
    }

    fun pauseTracking() = synchronized(this) {
        if (session.pause()) log.debug("Paused tracking $entityLabel '$currentId'")
    }

    fun resumeTracking() = synchronized(this) {
        if (session.resume()) log.debug("Resumed tracking $entityLabel '$currentId'")
    }

    /**
     * Stops the session and persists the remaining delta (total − already checkpointed).
     */
    fun stopTracking() = synchronized(this) { stopTrackingInternal() }

    private fun stopTrackingInternal() {
        val id = currentId ?: return
        val totalMs = session.stop()
        val delta = totalMs - checkpointedMs
        currentId = null
        checkpointedMs = 0L
        if (delta > 0) {
            onStop(id, delta)
        }
    }

    /**
     * Saves accumulated time **without** stopping the session.
     *
     * Only the delta since the previous checkpoint (or since session start) is passed
     * to [onStop], so repeated calls never double-count time.
     *
     * @return The delta in milliseconds that was saved, or `0` if nothing to save.
     */
    fun checkpoint(): Long = synchronized(this) {
        val id = currentId ?: return@synchronized 0L
        val totalMs = session.getAccumulatedMs()   // 0 if not tracking
        val delta = totalMs - checkpointedMs
        if (delta <= 0L) return@synchronized 0L
        checkpointedMs = totalMs
        onStop(id, delta)
        log.debug("Checkpoint for $entityLabel '$id': saved ${delta / 1000}s")
        delta
    }

    /** True only when tracking AND not paused. */
    fun isActive(): Boolean = session.isActive()

    fun getAccumulatedSeconds(): Long = session.getAccumulatedSeconds()

    /**
     * Returns only the seconds accumulated since the last checkpoint (or session start).
     * This is the "live" time that has NOT yet been saved to persistence.
     */
    fun getUnpersistedSeconds(): Long = synchronized(this) {
        val delta = session.getAccumulatedMs() - checkpointedMs
        if (delta > 0) delta / 1000 else 0L
    }
}
