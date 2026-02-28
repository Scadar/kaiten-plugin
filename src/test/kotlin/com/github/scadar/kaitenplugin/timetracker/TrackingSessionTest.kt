package com.github.scadar.kaitenplugin.timetracker

import org.junit.Assert.*
import org.junit.Test

class TrackingSessionTest {

    // ─── initial state ───────────────────────────────────────────────────────

    @Test
    fun `initial state is not tracking and not paused`() {
        val session = TrackingSession()
        assertFalse(session.isTracking)
        assertFalse(session.isPaused)
        assertFalse(session.isActive())
    }

    @Test
    fun `initial getAccumulatedMs returns 0`() {
        assertEquals(0L, TrackingSession().getAccumulatedMs())
    }

    @Test
    fun `initial getAccumulatedSeconds returns 0`() {
        assertEquals(0L, TrackingSession().getAccumulatedSeconds())
    }

    // ─── start ───────────────────────────────────────────────────────────────

    @Test
    fun `start sets isTracking and isActive`() {
        val session = TrackingSession()
        session.start()
        assertTrue(session.isTracking)
        assertFalse(session.isPaused)
        assertTrue(session.isActive())
    }

    @Test
    fun `start resets accumulated time from previous session`() {
        val session = TrackingSession()
        session.start()
        Thread.sleep(20)
        session.stop()

        session.start()
        val accumulated = session.getAccumulatedMs()
        assertTrue("After fresh start accumulated should be < 15 ms, was $accumulated", accumulated < 15)
    }

    // ─── pause ───────────────────────────────────────────────────────────────

    @Test
    fun `pause returns true when active`() {
        val session = TrackingSession()
        session.start()
        assertTrue(session.pause())
        assertTrue(session.isPaused)
        assertFalse(session.isActive())
        assertTrue(session.isTracking)
    }

    @Test
    fun `pause returns false when not tracking`() {
        assertFalse(TrackingSession().pause())
    }

    @Test
    fun `pause returns false when already paused`() {
        val session = TrackingSession()
        session.start()
        session.pause()
        assertFalse(session.pause())
    }

    @Test
    fun `getAccumulatedMs does not grow while paused`() {
        val session = TrackingSession()
        session.start()
        Thread.sleep(10)
        session.pause()
        val snapshot = session.getAccumulatedMs()
        Thread.sleep(20)
        assertEquals(snapshot, session.getAccumulatedMs())
    }

    // ─── resume ──────────────────────────────────────────────────────────────

    @Test
    fun `resume returns true when paused`() {
        val session = TrackingSession()
        session.start()
        session.pause()
        assertTrue(session.resume())
        assertTrue(session.isTracking)
        assertFalse(session.isPaused)
        assertTrue(session.isActive())
    }

    @Test
    fun `resume returns false when not tracking`() {
        assertFalse(TrackingSession().resume())
    }

    @Test
    fun `resume returns false when already active`() {
        val session = TrackingSession()
        session.start()
        assertFalse(session.resume())
    }

    // ─── stop ────────────────────────────────────────────────────────────────

    @Test
    fun `stop returns 0 when not tracking`() {
        assertEquals(0L, TrackingSession().stop())
    }

    @Test
    fun `stop returns positive ms after tracking`() {
        val session = TrackingSession()
        session.start()
        Thread.sleep(10)
        val elapsed = session.stop()
        assertTrue("elapsed should be > 0, was $elapsed", elapsed > 0)
        assertFalse(session.isTracking)
        assertFalse(session.isActive())
    }

    @Test
    fun `stop includes time accumulated before pause`() {
        val session = TrackingSession()
        session.start()
        Thread.sleep(15)
        session.pause()
        Thread.sleep(50) // paused time — should NOT be counted
        session.resume()
        Thread.sleep(15)
        val elapsed = session.stop()
        // Should be roughly 30 ms, definitely not 80+
        assertTrue("elapsed should be >= 10 ms, was $elapsed", elapsed >= 10)
        assertTrue("elapsed should be < 80 ms, was $elapsed", elapsed < 80)
    }

    @Test
    fun `stop resets state to not-tracking`() {
        val session = TrackingSession()
        session.start()
        session.stop()
        assertFalse(session.isTracking)
        assertFalse(session.isPaused)
        assertFalse(session.isActive())
        assertEquals(0L, session.getAccumulatedMs())
    }

    @Test
    fun `stop when paused returns only accumulated time`() {
        val session = TrackingSession()
        session.start()
        Thread.sleep(10)
        session.pause()
        val snapshot = session.getAccumulatedMs()
        Thread.sleep(20)
        val elapsed = session.stop()
        assertEquals(snapshot, elapsed)
    }
}
