package com.github.scadar.kaitenplugin.timetracker

import java.util.concurrent.atomic.AtomicBoolean

/**
 * Encapsulates the mutable state and arithmetic shared by all time-tracking services.
 *
 * Thread-safety contract:
 * - [isTracking] and [isPaused] are backed by [AtomicBoolean].
 * - [startTime] and [accumulatedMs] are [@Volatile] so readers always see the latest write.
 *   Callers are expected to serialise mutating operations (start / pause / resume / stop)
 *   — the services themselves ensure this via their own domain logic.
 */
class TrackingSession {

    @Volatile private var startTime: Long = 0L
    @Volatile private var accumulatedMs: Long = 0L

    private val _isTracking = AtomicBoolean(false)
    private val _isPaused   = AtomicBoolean(false)

    val isTracking: Boolean get() = _isTracking.get()
    val isPaused:   Boolean get() = _isPaused.get()

    /** True only when tracking AND not paused. */
    fun isActive(): Boolean = _isTracking.get() && !_isPaused.get()

    /** Starts a fresh session. Resets accumulated time. */
    fun start() {
        startTime     = System.currentTimeMillis()
        accumulatedMs = 0L
        _isTracking.set(true)
        _isPaused.set(false)
    }

    /**
     * Pauses the session, capturing elapsed time into the accumulator.
     * @return `true` if the session was active and is now paused; `false` if the call was a no-op.
     */
    fun pause(): Boolean {
        if (!_isTracking.get() || _isPaused.get()) return false
        accumulatedMs += System.currentTimeMillis() - startTime
        _isPaused.set(true)
        return true
    }

    /**
     * Resumes a paused session.
     * @return `true` if the session was paused and is now active; `false` if the call was a no-op.
     */
    fun resume(): Boolean {
        if (!_isTracking.get() || !_isPaused.get()) return false
        startTime = System.currentTimeMillis()
        _isPaused.set(false)
        return true
    }

    /**
     * Stops the session and returns total elapsed **milliseconds**.
     * After this call the session is reset and [isTracking] is `false`.
     *
     * @return Total milliseconds tracked, or `0` if the session was not active.
     */
    fun stop(): Long {
        if (!_isTracking.get()) return 0L
        val liveMs = if (!_isPaused.get()) System.currentTimeMillis() - startTime else 0L
        val total  = accumulatedMs + liveMs
        startTime     = 0L
        accumulatedMs = 0L
        _isTracking.set(false)
        _isPaused.set(false)
        return total
    }

    /**
     * Returns current accumulated time in **milliseconds** without stopping the session.
     * Returns `0` when not tracking.
     */
    fun getAccumulatedMs(): Long {
        if (!_isTracking.get()) return 0L
        val liveMs = if (!_isPaused.get()) System.currentTimeMillis() - startTime else 0L
        return accumulatedMs + liveMs
    }

    /**
     * Returns current accumulated time in **seconds** without stopping the session.
     * Returns `0` when not tracking.
     */
    fun getAccumulatedSeconds(): Long = getAccumulatedMs() / 1000L
}
