package com.github.scadar.kaitenplugin.timetracker

import com.intellij.openapi.diagnostic.Logger
import org.junit.Assert.*
import org.junit.Test

/**
 * No-op Logger so that TimeTracker can be instantiated in a plain JUnit test
 * without a full IntelliJ Platform application context.
 */
private object NoOpLogger : Logger() {
    override fun isDebugEnabled(): Boolean = false
    override fun debug(message: String) {}
    override fun debug(t: Throwable?) {}
    override fun debug(message: String, t: Throwable?) {}
    override fun info(message: String) {}
    override fun info(message: String, t: Throwable?) {}
    override fun warn(message: String, t: Throwable?) {}
    override fun error(message: String, t: Throwable?, vararg details: String) {}
}

class TimeTrackerTest {

    private fun tracker(calls: MutableList<Pair<String, Long>> = mutableListOf()): TimeTracker<String> =
        TimeTracker("test", NoOpLogger) { id, ms -> calls.add(id to ms) }

    // ─── startTracking ───────────────────────────────────────────────────────

    @Test
    fun `startTracking begins an active session`() {
        val t = tracker()
        t.startTracking("branch-1")
        assertTrue(t.isActive())
        assertEquals("branch-1", t.currentId)
    }

    @Test
    fun `startTracking same id when active is a no-op`() {
        val calls = mutableListOf<Pair<String, Long>>()
        val t = tracker(calls)
        t.startTracking("branch-1")
        t.startTracking("branch-1")
        assertTrue(t.isActive())
        assertTrue("onStop must not have been called", calls.isEmpty())
    }

    @Test
    fun `startTracking different id stops current and starts new`() {
        val calls = mutableListOf<Pair<String, Long>>()
        val t = tracker(calls)
        t.startTracking("branch-1")
        Thread.sleep(10)
        t.startTracking("branch-2")
        assertEquals("branch-2", t.currentId)
        assertEquals(1, calls.size)
        assertEquals("branch-1", calls[0].first)
        assertTrue("delta for branch-1 must be > 0", calls[0].second > 0)
    }

    // ─── stopTracking ────────────────────────────────────────────────────────

    @Test
    fun `stopTracking calls onStop with positive delta`() {
        val calls = mutableListOf<Pair<String, Long>>()
        val t = tracker(calls)
        t.startTracking("branch-1")
        Thread.sleep(10)
        t.stopTracking()
        assertEquals(1, calls.size)
        assertTrue("delta should be > 0, was ${calls[0].second}", calls[0].second > 0)
        assertNull(t.currentId)
        assertFalse(t.isActive())
    }

    @Test
    fun `stopTracking when not tracking is a no-op`() {
        val calls = mutableListOf<Pair<String, Long>>()
        tracker(calls).stopTracking()
        assertTrue(calls.isEmpty())
    }

    // ─── checkpoint ──────────────────────────────────────────────────────────

    @Test
    fun `checkpoint saves delta and keeps session alive`() {
        val calls = mutableListOf<Pair<String, Long>>()
        val t = tracker(calls)
        t.startTracking("branch-1")
        Thread.sleep(10)
        val delta = t.checkpoint()
        assertTrue("checkpoint delta should be > 0, was $delta", delta > 0)
        assertEquals(1, calls.size)
        assertTrue(t.isActive())
        assertEquals("branch-1", t.currentId)
    }

    @Test
    fun `checkpoint does not double-count time`() {
        val calls = mutableListOf<Pair<String, Long>>()
        val t = tracker(calls)
        t.startTracking("branch-1")
        Thread.sleep(15)
        t.checkpoint()          // saves ~15 ms
        Thread.sleep(15)
        t.stopTracking()        // saves ~15 ms more

        assertEquals(2, calls.size)
        val first = calls[0].second
        val second = calls[1].second
        assertTrue("first delta > 0, was $first", first > 0)
        assertTrue("second delta > 0, was $second", second > 0)
        // Together they should be roughly 30 ms, not 45+ ms (no double-counting)
        val total = first + second
        assertTrue("total should be < 60 ms, was $total", total < 60)
    }

    @Test
    fun `checkpoint returns 0 when not tracking`() {
        assertEquals(0L, tracker().checkpoint())
    }

    // ─── pause / resume ──────────────────────────────────────────────────────

    @Test
    fun `pauseTracking pauses session`() {
        val t = tracker()
        t.startTracking("branch-1")
        t.pauseTracking()
        assertFalse(t.isActive())
    }

    @Test
    fun `resumeTracking resumes paused session`() {
        val t = tracker()
        t.startTracking("branch-1")
        t.pauseTracking()
        t.resumeTracking()
        assertTrue(t.isActive())
    }

    // ─── getUnpersistedSeconds ───────────────────────────────────────────────

    @Test
    fun `getUnpersistedSeconds returns 0 when not tracking`() {
        assertEquals(0L, tracker().getUnpersistedSeconds())
    }

    @Test
    fun `getUnpersistedSeconds resets to 0 after checkpoint`() {
        val t = tracker()
        t.startTracking("branch-1")
        Thread.sleep(1100)      // accumulate > 1 second
        t.checkpoint()
        assertEquals(0L, t.getUnpersistedSeconds())
    }
}
