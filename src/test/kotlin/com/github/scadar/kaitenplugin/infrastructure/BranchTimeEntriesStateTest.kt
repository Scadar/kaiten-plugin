package com.github.scadar.kaitenplugin.infrastructure

import com.github.scadar.kaitenplugin.domain.BranchTimeEntry
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.time.LocalDate

class BranchTimeEntriesStateTest {

    private lateinit var state: BranchTimeEntriesState

    private val today: LocalDate = LocalDate.of(2025, 6, 1)
    private val yesterday: LocalDate = today.minusDays(1)

    @Before
    fun setUp() {
        state = BranchTimeEntriesState()
    }

    // ─── addEntry ─────────────────────────────────────────────────────────────

    @Test
    fun `addEntry stores a new entry`() {
        state.addEntry(BranchTimeEntry("feature/ktn-1", today, 60L))
        val entries = state.getAllEntries()["feature/ktn-1"]
        assertNotNull(entries)
        assertEquals(1, entries!!.size)
        assertEquals(60L, entries[0].durationSeconds)
    }

    @Test
    fun `addEntry accumulates duration for the same branch and date`() {
        state.addEntry(BranchTimeEntry("feature/ktn-1", today, 30L))
        state.addEntry(BranchTimeEntry("feature/ktn-1", today, 45L))
        val entries = state.getAllEntries()["feature/ktn-1"]
        assertNotNull(entries)
        assertEquals(1, entries!!.size)
        assertEquals(75L, entries[0].durationSeconds)
    }

    @Test
    fun `addEntry creates separate entries for different dates`() {
        state.addEntry(BranchTimeEntry("feature/ktn-1", today, 30L))
        state.addEntry(BranchTimeEntry("feature/ktn-1", yesterday, 45L))
        val entries = state.getAllEntries()["feature/ktn-1"]
        assertNotNull(entries)
        assertEquals(2, entries!!.size)
    }

    @Test
    fun `addEntry creates separate groups for different branches`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 30L))
        state.addEntry(BranchTimeEntry("branch-b", today, 60L))
        val all = state.getAllEntries()
        assertEquals(2, all.size)
        assertTrue(all.containsKey("branch-a"))
        assertTrue(all.containsKey("branch-b"))
    }

    @Test
    fun `addEntry with zero duration is stored`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 0L))
        val entries = state.getAllEntries()["branch-a"]
        assertNotNull(entries)
        assertEquals(0L, entries!![0].durationSeconds)
    }

    // ─── getAllEntries ────────────────────────────────────────────────────────

    @Test
    fun `getAllEntries returns empty map when no entries`() {
        assertTrue(state.getAllEntries().isEmpty())
    }

    @Test
    fun `getAllEntries groups entries correctly by branch name`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 10L))
        state.addEntry(BranchTimeEntry("branch-b", today, 20L))
        state.addEntry(BranchTimeEntry("branch-a", yesterday, 30L))

        val all = state.getAllEntries()
        assertEquals(2, all.size)
        assertEquals(2, all["branch-a"]!!.size)
        assertEquals(1, all["branch-b"]!!.size)
    }

    @Test
    fun `getAllEntries preserves branch name and date in domain objects`() {
        state.addEntry(BranchTimeEntry("feature/ktn-99", today, 120L))
        val entry = state.getAllEntries()["feature/ktn-99"]!!.first()
        assertEquals("feature/ktn-99", entry.branchName)
        assertEquals(today, entry.date)
        assertEquals(120L, entry.durationSeconds)
    }

    // ─── clearBranch ─────────────────────────────────────────────────────────

    @Test
    fun `clearBranch removes all entries for that branch`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 30L))
        state.addEntry(BranchTimeEntry("branch-a", yesterday, 60L))
        state.clearBranch("branch-a")
        assertFalse(state.getAllEntries().containsKey("branch-a"))
    }

    @Test
    fun `clearBranch does not affect other branches`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 30L))
        state.addEntry(BranchTimeEntry("branch-b", today, 60L))
        state.clearBranch("branch-a")
        val all = state.getAllEntries()
        assertFalse(all.containsKey("branch-a"))
        assertTrue(all.containsKey("branch-b"))
    }

    @Test
    fun `clearBranch on non-existent branch is a no-op`() {
        state.addEntry(BranchTimeEntry("branch-a", today, 30L))
        state.clearBranch("branch-x")
        assertEquals(1, state.getAllEntries().size)
    }

    @Test
    fun `clearBranch on empty state is a no-op`() {
        state.clearBranch("branch-a")
        assertTrue(state.getAllEntries().isEmpty())
    }
}
