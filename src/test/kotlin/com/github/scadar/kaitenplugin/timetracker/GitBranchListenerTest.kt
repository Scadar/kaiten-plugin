package com.github.scadar.kaitenplugin.timetracker

import org.junit.Assert.*
import org.junit.Test

class GitBranchListenerTest {

    // ─── extractTaskIdFromBranch ─────────────────────────────────────────────

    @Test
    fun `returns id for standard ktn branch`() {
        assertEquals(123L, GitBranchListener.extractTaskIdFromBranch("task/ktn-123"))
    }

    @Test
    fun `returns id when ktn is at the start`() {
        assertEquals(789L, GitBranchListener.extractTaskIdFromBranch("ktn-789"))
    }

    @Test
    fun `returns id when ktn appears in the middle`() {
        assertEquals(42L, GitBranchListener.extractTaskIdFromBranch("feature/fix-ktn-42-some-description"))
    }

    @Test
    fun `regex is case-insensitive`() {
        assertEquals(456L, GitBranchListener.extractTaskIdFromBranch("task/KTN-456"))
        assertEquals(456L, GitBranchListener.extractTaskIdFromBranch("task/Ktn-456"))
    }

    @Test
    fun `returns null for main branch`() {
        assertNull(GitBranchListener.extractTaskIdFromBranch("main"))
    }

    @Test
    fun `returns null for develop branch`() {
        assertNull(GitBranchListener.extractTaskIdFromBranch("develop"))
    }

    @Test
    fun `returns null for feature branch without ktn`() {
        assertNull(GitBranchListener.extractTaskIdFromBranch("feature/some-thing"))
    }

    @Test
    fun `returns null for empty string`() {
        assertNull(GitBranchListener.extractTaskIdFromBranch(""))
    }

    @Test
    fun `picks the first match when multiple ktn ids are present`() {
        assertEquals(100L, GitBranchListener.extractTaskIdFromBranch("ktn-100-and-ktn-200"))
    }

    @Test
    fun `handles zero-padded numeric ids`() {
        assertEquals(42L, GitBranchListener.extractTaskIdFromBranch("ktn-042"))
    }

    @Test
    fun `handles large task ids`() {
        assertEquals(999999L, GitBranchListener.extractTaskIdFromBranch("task/ktn-999999"))
    }
}
