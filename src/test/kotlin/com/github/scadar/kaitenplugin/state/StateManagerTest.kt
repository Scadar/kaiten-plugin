package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.google.gson.JsonElement
import com.intellij.testFramework.fixtures.BasePlatformTestCase

/**
 * Tests for StateManager
 *
 * Note: These tests verify StateManager functionality without full JCEF integration.
 * Full integration tests with JCEFBridgeHandler require mocking JBCefBrowser.
 */
class StateManagerTest : BasePlatformTestCase() {

    private lateinit var stateManager: StateManager

    override fun setUp() {
        super.setUp()
        stateManager = StateManager.getInstance(project)
    }

    override fun tearDown() {
        try {
            stateManager.reset()
        } finally {
            super.tearDown()
        }
    }

    /**
     * Test state initialization with default values
     */
    fun testStateInitialization() {
        val state = stateManager.getState()

        assertNotNull(state)
        assertTrue(state.containsKey("projectPath"))
        assertTrue(state.containsKey("selectedFile"))
        assertTrue(state.containsKey("settings"))
        assertTrue(state.containsKey("user"))
        assertTrue(state.containsKey("tasks"))
        assertTrue(state.containsKey("filters"))

        // Verify initial values
        assertEquals(project.basePath, state["projectPath"])
        assertNull(state["selectedFile"])
        assertTrue(state["settings"] is Map<*, *>)
        assertTrue(state["tasks"] is List<*>)
        assertTrue((state["tasks"] as List<*>).isEmpty())
    }

    /**
     * Test updating project path
     */
    fun testUpdateProjectPath() {
        val newPath = "/test/project/path"
        stateManager.updateProjectPath(newPath)

        val state = stateManager.getState()
        assertEquals(newPath, state["projectPath"])
    }

    /**
     * Test updating selected file
     */
    fun testUpdateSelectedFile() {
        val filePath = "/test/file.kt"
        stateManager.updateSelectedFile(filePath)

        val state = stateManager.getState()
        assertEquals(filePath, state["selectedFile"])
    }

    /**
     * Test updating tasks list
     */
    fun testUpdateTasks() {
        val tasks = listOf(
            mapOf("id" to "1", "title" to "Task 1"),
            mapOf("id" to "2", "title" to "Task 2")
        )
        stateManager.updateTasks(tasks)

        val state = stateManager.getState()
        val stateTasks = state["tasks"] as List<*>
        assertEquals(2, stateTasks.size)
        assertEquals(tasks, stateTasks)
    }

    /**
     * Test updating filters
     */
    fun testUpdateFilters() {
        val filters = mapOf(
            "byAssignee" to true,
            "byParticipant" to false,
            "spaceId" to 123L
        )
        stateManager.updateFilters(filters)

        val state = stateManager.getState()
        assertEquals(filters, state["filters"])
    }

    /**
     * Test updating user information
     */
    fun testUpdateUser() {
        val user = mapOf(
            "id" to "123",
            "name" to "Test User",
            "email" to "test@example.com"
        )
        stateManager.updateUser(user)

        val state = stateManager.getState()
        assertEquals(user, state["user"])
    }

    /**
     * Test batch state update
     */
    fun testBatchStateUpdate() {
        val updates = mapOf(
            "projectPath" to "/new/path",
            "selectedFile" to "/new/file.kt",
            "tasks" to listOf(mapOf("id" to "1"))
        )
        stateManager.updateState(updates)

        val state = stateManager.getState()
        assertEquals("/new/path", state["projectPath"])
        assertEquals("/new/file.kt", state["selectedFile"])
        assertEquals(listOf(mapOf("id" to "1")), state["tasks"])
    }

    /**
     * Test update single field
     */
    fun testUpdateField() {
        stateManager.updateField("projectPath", "/custom/path")

        val state = stateManager.getState()
        assertEquals("/custom/path", state["projectPath"])
    }

    /**
     * Test empty update does nothing
     */
    fun testEmptyUpdateDoesNothing() {
        val stateBefore = stateManager.getState().toMap()
        stateManager.updateState(emptyMap())
        val stateAfter = stateManager.getState()

        assertEquals(stateBefore, stateAfter)
    }

    /**
     * Test settings refresh from KaitenSettingsState
     */
    fun testRefreshSettings() {
        val settingsState = KaitenSettingsState.getInstance()
        settingsState.serverUrl = "https://test.kaiten.io"
        settingsState.selectedSpaceId = 456L
        settingsState.filterByAssignee = false

        stateManager.refreshSettings()

        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val settings = state["settings"] as Map<String, Any?>
        assertEquals("https://test.kaiten.io", settings["serverUrl"])
        assertEquals(456L, settings["selectedSpaceId"])
        assertEquals(false, settings["filterByAssignee"])
    }

    /**
     * Test state change listener registration
     */
    fun testStateChangeListener() {
        var listenerCalled = false
        var receivedChanges: Map<String, Any?>? = null

        val listener: (Map<String, Any?>) -> Unit = { changes ->
            listenerCalled = true
            receivedChanges = changes
        }

        stateManager.addStateChangeListener(listener)
        stateManager.updateProjectPath("/test/path")

        assertTrue(listenerCalled)
        assertNotNull(receivedChanges)
        assertEquals("/test/path", receivedChanges?.get("projectPath"))
    }

    /**
     * Test multiple state change listeners
     */
    fun testMultipleStateChangeListeners() {
        var listener1Called = false
        var listener2Called = false

        val listener1: (Map<String, Any?>) -> Unit = { _ ->
            listener1Called = true
        }

        val listener2: (Map<String, Any?>) -> Unit = { _ ->
            listener2Called = true
        }

        stateManager.addStateChangeListener(listener1)
        stateManager.addStateChangeListener(listener2)
        stateManager.updateProjectPath("/test/path")

        assertTrue(listener1Called)
        assertTrue(listener2Called)
    }

    /**
     * Test removing state change listener
     */
    fun testRemoveStateChangeListener() {
        var listenerCalled = false

        val listener: (Map<String, Any?>) -> Unit = { _ ->
            listenerCalled = true
        }

        stateManager.addStateChangeListener(listener)
        stateManager.removeStateChangeListener(listener)
        stateManager.updateProjectPath("/test/path")

        assertFalse(listenerCalled)
    }

    /**
     * Test state reset
     */
    fun testStateReset() {
        // Modify state
        stateManager.updateProjectPath("/modified/path")
        stateManager.updateSelectedFile("/modified/file.kt")
        stateManager.updateTasks(listOf(mapOf("id" to "1")))

        // Reset state
        stateManager.reset()

        val state = stateManager.getState()
        assertEquals(project.basePath, state["projectPath"])
        assertNull(state["selectedFile"])
        assertTrue((state["tasks"] as List<*>).isEmpty())
    }

    /**
     * Test thread-safety of concurrent state updates
     */
    fun testConcurrentStateUpdates() {
        val threads = (1..10).map { i ->
            Thread {
                stateManager.updateField("key$i", "value$i")
            }
        }

        threads.forEach { it.start() }
        threads.forEach { it.join() }

        val state = stateManager.getState()
        // All updates should be reflected
        for (i in 1..10) {
            assertEquals("value$i", state["key$i"])
        }
    }

    /**
     * Test getInstance returns same instance for same project
     */
    fun testGetInstanceSingleton() {
        val instance1 = StateManager.getInstance(project)
        val instance2 = StateManager.getInstance(project)

        assertSame(instance1, instance2)
    }

    /**
     * Test settings map structure
     */
    fun testSettingsMapStructure() {
        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val settings = state["settings"] as Map<String, Any?>

        assertTrue(settings.containsKey("serverUrl"))
        assertTrue(settings.containsKey("apiToken"))
        assertTrue(settings.containsKey("selectedSpaceId"))
        assertTrue(settings.containsKey("selectedBoardId"))
        assertTrue(settings.containsKey("selectedColumnIds"))
        assertTrue(settings.containsKey("filterByAssignee"))
        assertTrue(settings.containsKey("filterByParticipant"))
        assertTrue(settings.containsKey("filterLogic"))
        assertTrue(settings.containsKey("viewMode"))
        assertTrue(settings.containsKey("skipSslVerification"))
    }

    /**
     * Test filters map structure
     */
    fun testFiltersMapStructure() {
        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val filters = state["filters"] as Map<String, Any?>

        assertTrue(filters.containsKey("byAssignee"))
        assertTrue(filters.containsKey("byParticipant"))
        assertTrue(filters.containsKey("logic"))
        assertTrue(filters.containsKey("spaceId"))
        assertTrue(filters.containsKey("boardId"))
        assertTrue(filters.containsKey("columnIds"))
    }

    /**
     * Test user info null when no current user
     */
    fun testUserInfoNullWhenNoCurrentUser() {
        val settingsState = KaitenSettingsState.getInstance()
        settingsState.currentUserId = null

        stateManager.refreshSettings()

        val state = stateManager.getState()
        assertNull(state["user"])
    }

    /**
     * Test user info present when current user exists
     */
    fun testUserInfoPresentWhenCurrentUserExists() {
        val settingsState = KaitenSettingsState.getInstance()
        settingsState.currentUserId = 123L

        stateManager.refreshSettings()

        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val user = state["user"] as Map<String, Any?>?
        assertNotNull(user)
        assertEquals("123", user?.get("id"))
    }

    override fun getTestDataPath() = "src/test/testData"
}
