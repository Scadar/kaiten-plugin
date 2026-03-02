package com.github.scadar.kaitenplugin.vcs

import org.junit.Assert.*
import org.junit.Test

class BranchTaskExtractorTest {

    private val defaultPatterns = listOf("task/ktn-{id}")

    // ─── pattern matching ────────────────────────────────────────────────────

    @Test
    fun `extracts id from branch matching default pattern`() {
        assertEquals(123L, BranchTaskExtractor.extractTaskId("task/ktn-123", defaultPatterns))
    }

    @Test
    fun `pattern match is case-insensitive`() {
        assertEquals(456L, BranchTaskExtractor.extractTaskId("task/KTN-456", defaultPatterns))
        assertEquals(456L, BranchTaskExtractor.extractTaskId("TASK/ktn-456", defaultPatterns))
    }

    @Test
    fun `returns null when branch does not match any pattern`() {
        assertNull(BranchTaskExtractor.extractTaskId("main", defaultPatterns))
        assertNull(BranchTaskExtractor.extractTaskId("develop", defaultPatterns))
        assertNull(BranchTaskExtractor.extractTaskId("feature/no-task-here", defaultPatterns))
    }

    @Test
    fun `returns null for empty branch name`() {
        assertNull(BranchTaskExtractor.extractTaskId("", defaultPatterns))
    }

    @Test
    fun `returns null when pattern list is empty`() {
        assertNull(BranchTaskExtractor.extractTaskId("task/ktn-99", emptyList()))
    }

    // ─── multiple patterns ───────────────────────────────────────────────────

    @Test
    fun `uses first matching pattern when multiple patterns are configured`() {
        val patterns = listOf("feature/ktn-{id}", "task/ktn-{id}")
        assertEquals(10L, BranchTaskExtractor.extractTaskId("feature/ktn-10", patterns))
        assertEquals(20L, BranchTaskExtractor.extractTaskId("task/ktn-20", patterns))
    }

    @Test
    fun `falls through to second pattern when first does not match`() {
        val patterns = listOf("release/ktn-{id}", "task/ktn-{id}")
        assertEquals(77L, BranchTaskExtractor.extractTaskId("task/ktn-77", patterns))
    }

    // ─── custom patterns ─────────────────────────────────────────────────────

    @Test
    fun `supports custom prefix pattern`() {
        val patterns = listOf("jira/{id}")
        assertEquals(500L, BranchTaskExtractor.extractTaskId("jira/500", patterns))
    }

    @Test
    fun `supports pattern with special regex characters in literal parts`() {
        // Dots in the pattern must be treated as literals, not regex wildcards
        val patterns = listOf("feat.ktn-{id}")
        assertNull(BranchTaskExtractor.extractTaskId("featXktn-1", patterns))
        assertEquals(1L, BranchTaskExtractor.extractTaskId("feat.ktn-1", patterns))
    }

    // ─── edge cases ──────────────────────────────────────────────────────────

    @Test
    fun `handles zero-padded ids`() {
        assertEquals(42L, BranchTaskExtractor.extractTaskId("task/ktn-042", defaultPatterns))
    }

    @Test
    fun `handles large task ids`() {
        assertEquals(999999L, BranchTaskExtractor.extractTaskId("task/ktn-999999", defaultPatterns))
    }

    // ─── buildCommitMessage ──────────────────────────────────────────────────

    @Test
    fun `buildCommitMessage replaces id and title placeholders`() {
        val msg = BranchTaskExtractor.buildCommitMessage("ktn-{id}: {title}", 42L, "Fix login bug")
        assertEquals("ktn-42: Fix login bug", msg)
    }

    @Test
    fun `buildCommitMessage replaces title with empty string when null`() {
        val msg = BranchTaskExtractor.buildCommitMessage("ktn-{id}: {title}", 7L, null)
        assertEquals("ktn-7: ", msg)
    }

    @Test
    fun `buildCommitMessage supports id-only template`() {
        val msg = BranchTaskExtractor.buildCommitMessage("[KTN-{id}]", 99L, null)
        assertEquals("[KTN-99]", msg)
    }
}
