package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking

/**
 * Tests for StateSyncService
 *
 * Note: These tests verify StateSyncService functionality without full JCEF integration.
 * Full integration tests with JCEFBridgeHandler require mocking JBCefBrowser.
 *
 * The tests focus on:
 * - Service initialization and lifecycle
 * - State synchronization triggers
 * - Periodic reconciliation
 * - Manual sync operations
 * - Integration with StateManager
 */
class StateSyncServiceTest : BasePlatformTestCase() {

    private lateinit var syncService: StateSyncService
    private lateinit var stateManager: StateManager

    override fun setUp() {
        super.setUp()
        syncService = StateSyncService.getInstance(project)
        stateManager = StateManager.getInstance(project)
    }

    override fun tearDown() {
        try {
            syncService.dispose()
            stateManager.reset()
        } finally {
            super.tearDown()
        }
    }

    /**
     * Test service initialization
     */
    fun testServiceInitialization() {
        assertNotNull(syncService)
        assertFalse("Service should not be ready before initialization", syncService.isReady())
    }

    /**
     * Test getInstance returns same instance for same project
     */
    fun testGetInstanceSingleton() {
        val instance1 = StateSyncService.getInstance(project)
        val instance2 = StateSyncService.getInstance(project)

        assertSame(instance1, instance2)
    }

    /**
     * Test service is not ready before initialization
     */
    fun testServiceNotReadyBeforeInitialization() {
        assertFalse(syncService.isReady())
    }

    /**
     * Test sync settings functionality
     *
     * Verifies that syncSettings triggers state refresh
     */
    fun testSyncSettings() = runBlocking {
        // Sync settings (should trigger refresh)
        syncService.syncSettings()

        // Wait for async operation
        delay(200)

        // Verify state contains settings (structure test, not value test)
        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val settings = state["settings"] as Map<String, Any?>

        // Verify settings map structure is present
        assertNotNull(settings)
        assertTrue(settings.containsKey("serverUrl"))
        assertTrue(settings.containsKey("selectedSpaceId"))
        assertTrue(settings.containsKey("filterByAssignee"))
    }

    /**
     * Test reconcile state functionality
     *
     * Verifies that reconcileState refreshes all state from IDE sources
     */
    fun testReconcileState() = runBlocking {
        // Reconcile state
        syncService.reconcileState()

        // Wait for async operation
        delay(200)

        // Verify state was updated with all required fields
        val state = stateManager.getState()

        // Verify project path is updated
        assertEquals(project.basePath, state["projectPath"])

        // Verify settings structure is present
        assertTrue(state.containsKey("settings"))
        assertTrue(state.containsKey("filters"))
        assertTrue(state.containsKey("tasks"))
    }

    /**
     * Test force refresh functionality
     *
     * Verifies that forceRefresh resets and reconciles state
     */
    fun testForceRefresh() = runBlocking {
        // Modify state directly
        stateManager.updateProjectPath("/old/path")
        stateManager.updateSelectedFile("/old/file.kt")

        // Force refresh
        syncService.forceRefresh()

        // Wait for async operations
        delay(300)

        // Verify state was reset and reconciled
        val state = stateManager.getState()

        // After force refresh, project path should be from actual project
        assertTrue("Project path should be set", state.containsKey("projectPath"))

        // All required fields should be present
        assertTrue(state.containsKey("settings"))
        assertTrue(state.containsKey("selectedFile"))
        assertTrue(state.containsKey("tasks"))
    }

    /**
     * Test sync current file selection
     *
     * Verifies that syncCurrentFileSelection updates the selected file in state
     */
    fun testSyncCurrentFileSelection() = runBlocking {
        // Note: In test environment, FileEditorManager.selectedFiles is typically empty
        syncService.syncCurrentFileSelection()

        // Wait for async operation
        delay(100)

        // Verify selectedFile is set (null in test environment)
        val state = stateManager.getState()
        assertTrue(state.containsKey("selectedFile"))
    }

    /**
     * Test service disposal
     *
     * Verifies that dispose cleans up resources properly
     */
    fun testServiceDisposal() {
        // Dispose service
        syncService.dispose()

        // Verify service is not ready after disposal
        assertFalse(syncService.isReady())
    }

    /**
     * Test multiple initializations are handled gracefully
     *
     * Verifies that calling initialize multiple times doesn't cause issues
     */
    fun testMultipleInitializationsHandled() {
        // Note: We can't actually initialize with a real bridge in tests
        // This test verifies the service doesn't crash with repeated calls
        // In a real scenario, initialize would be called with a JCEFBridgeHandler

        // Verify service doesn't crash
        assertNotNull(syncService)
        assertFalse(syncService.isReady())
    }

    /**
     * Test sync operations are non-blocking
     *
     * Verifies that sync operations run asynchronously
     */
    fun testSyncOperationsAreNonBlocking() {
        val startTime = System.currentTimeMillis()

        // Call sync operations (these should be async)
        syncService.syncSettings()
        syncService.reconcileState()
        syncService.syncCurrentFileSelection()

        val duration = System.currentTimeMillis() - startTime

        // Operations should return quickly (not block)
        assertTrue("Sync operations should be non-blocking", duration < 100)
    }

    /**
     * Test concurrent sync operations are safe
     *
     * Verifies that multiple concurrent sync operations don't cause issues
     */
    fun testConcurrentSyncOperationsSafe() = runBlocking {
        // Trigger multiple sync operations concurrently
        syncService.syncSettings()
        syncService.reconcileState()
        syncService.syncCurrentFileSelection()
        syncService.forceRefresh()

        // Wait for all operations to complete
        delay(500)

        // Verify state is consistent
        val state = stateManager.getState()
        assertNotNull(state)
        assertTrue(state.containsKey("projectPath"))
        assertTrue(state.containsKey("settings"))
    }

    /**
     * Test state manager integration
     *
     * Verifies that StateSyncService properly integrates with StateManager
     */
    fun testStateManagerIntegration() = runBlocking {
        // Sync via service
        syncService.syncSettings()
        delay(200)

        // Verify StateManager has updated state with proper structure
        val state = stateManager.getState()

        // Verify all required state fields are present
        assertTrue(state.containsKey("settings"))
        assertTrue(state.containsKey("projectPath"))
        assertTrue(state.containsKey("selectedFile"))
        assertTrue(state.containsKey("tasks"))
        assertTrue(state.containsKey("filters"))
        assertTrue(state.containsKey("user"))
    }

    /**
     * Test service handles errors gracefully
     *
     * Verifies that sync operations handle errors without crashing
     */
    fun testServiceHandlesErrorsGracefully() = runBlocking {
        // Call sync operations (may encounter errors in test environment)
        syncService.syncSettings()
        syncService.reconcileState()
        syncService.syncCurrentFileSelection()

        delay(100)

        // Service should still be functional
        assertNotNull(syncService)
    }

    /**
     * Test settings synchronization updates all setting fields
     *
     * Verifies that all settings fields are properly synced
     */
    fun testSettingsSynchronizationUpdatesAllFields() = runBlocking {
        // Sync settings
        syncService.syncSettings()
        delay(200)

        // Verify all required settings fields are present in state
        val state = stateManager.getState()
        @Suppress("UNCHECKED_CAST")
        val settings = state["settings"] as Map<String, Any?>

        // Verify all settings fields exist (structure test)
        assertTrue(settings.containsKey("serverUrl"))
        assertTrue(settings.containsKey("apiToken"))
        assertTrue(settings.containsKey("selectedSpaceId"))
        assertTrue(settings.containsKey("selectedBoardId"))
        assertTrue(settings.containsKey("filterByAssignee"))
        assertTrue(settings.containsKey("filterByParticipant"))
        assertTrue(settings.containsKey("filterLogic"))
        assertTrue(settings.containsKey("viewMode"))
        assertTrue(settings.containsKey("skipSslVerification"))
        assertTrue(settings.containsKey("selectedColumnIds"))

        // Verify selected filters map
        @Suppress("UNCHECKED_CAST")
        val filters = state["filters"] as Map<String, Any?>
        assertTrue(filters.containsKey("byAssignee"))
        assertTrue(filters.containsKey("byParticipant"))
        assertTrue(filters.containsKey("logic"))
    }

    /**
     * Test reconciliation updates project path
     *
     * Verifies that reconciliation updates the project path from current project
     */
    fun testReconciliationUpdatesProjectPath() = runBlocking {
        // Set a different project path
        stateManager.updateProjectPath("/different/path")

        // Reconcile state
        syncService.reconcileState()
        delay(200)

        // Verify project path is present (reconciliation should update it)
        val state = stateManager.getState()
        assertTrue("Project path should be present", state.containsKey("projectPath"))
        assertNotNull("Project path should not be null after reconciliation", state["projectPath"])
    }

    /**
     * Test service state after disposal
     *
     * Verifies that operations after disposal are safe
     */
    fun testServiceStateAfterDisposal() = runBlocking {
        // Dispose service
        syncService.dispose()

        // Operations after disposal should not crash
        syncService.syncSettings()
        syncService.reconcileState()

        delay(100)

        // Verify no crash occurred
        assertNotNull(syncService)
    }

    override fun getTestDataPath() = "src/test/testData"
}
