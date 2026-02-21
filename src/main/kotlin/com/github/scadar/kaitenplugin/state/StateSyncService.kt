package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import kotlinx.coroutines.*
import java.util.concurrent.atomic.AtomicBoolean

/**
 * StateSyncService - Service to handle state synchronization via bridge
 *
 * This service orchestrates state synchronization between the IDE and React by:
 * - Initializing StateManager with bridge handler
 * - Listening to IDE events (file selection, settings changes) and syncing to React
 * - Providing methods to trigger manual state synchronization
 * - Handling periodic state reconciliation to prevent desync
 * - Coordinating between StateManager and JCEFBridgeHandler
 *
 * The service ensures bidirectional state consistency:
 * - IDE → React: File selections, project changes, settings updates
 * - React → IDE: User actions, filter changes, settings modifications
 */
@Service(Service.Level.PROJECT)
class StateSyncService(private val project: Project) {
    private val log = logger<StateSyncService>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Bridge and state manager references
    @Volatile
    private var bridgeHandler: JCEFBridgeHandler? = null

    @Volatile
    private var stateManager: StateManager? = null

    // Service state
    private val isInitialized = AtomicBoolean(false)
    private val isSyncing = AtomicBoolean(false)

    // Periodic reconciliation job
    private var reconciliationJob: Job? = null

    // Reconciliation interval (60 seconds)
    private val reconciliationIntervalMs = 60_000L

    init {
        log.info("StateSyncService initialized for project: ${project.name}")
    }

    /**
     * Initialize the sync service with bridge handler and state manager
     *
     * This should be called once the JCEF bridge is ready and StateManager is available.
     *
     * @param bridge JCEFBridgeHandler instance
     */
    fun initialize(bridge: JCEFBridgeHandler) {
        if (isInitialized.getAndSet(true)) {
            log.warn("StateSyncService already initialized, skipping")
            return
        }

        bridgeHandler = bridge
        stateManager = StateManager.getInstance(project)

        // Connect StateManager to bridge
        stateManager?.setBridgeHandler(bridge)

        // Set up IDE event listeners
        setupFileSelectionListener()
        setupSettingsChangeListener()

        // Start periodic reconciliation
        startPeriodicReconciliation()

        log.info("StateSyncService initialized and listeners set up")
    }

    /**
     * Set up file selection listener to sync selected file to React
     */
    private fun setupFileSelectionListener() {
        project.messageBus.connect(scope).subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: com.intellij.openapi.fileEditor.FileEditorManagerEvent) {
                    val selectedFile = event.newFile
                    syncSelectedFile(selectedFile)
                }
            }
        )

        log.debug("File selection listener set up")
    }

    /**
     * Set up settings change listener to sync settings to React
     */
    private fun setupSettingsChangeListener() {
        // Add state change listener to StateManager to log changes
        stateManager?.addStateChangeListener { changes ->
            log.debug("State changed: ${changes.keys}")
        }

        log.debug("Settings change listener set up")
    }

    /**
     * Start periodic state reconciliation to prevent desync
     *
     * Every 60 seconds, we fetch the full state from IDE and sync to React
     * to ensure consistency even if some updates were missed.
     */
    private fun startPeriodicReconciliation() {
        reconciliationJob = scope.launch {
            while (isActive) {
                delay(reconciliationIntervalMs)
                try {
                    reconcileState()
                } catch (e: Exception) {
                    log.error("Error during periodic reconciliation", e)
                }
            }
        }

        log.debug("Periodic reconciliation started (interval: ${reconciliationIntervalMs}ms)")
    }

    /**
     * Sync selected file to React
     *
     * @param file Selected virtual file (null if no file selected)
     */
    private fun syncSelectedFile(file: VirtualFile?) {
        scope.launch {
            try {
                val filePath = file?.path
                stateManager?.updateSelectedFile(filePath)
                log.debug("Synced selected file: $filePath")
            } catch (e: Exception) {
                log.error("Error syncing selected file", e)
            }
        }
    }

    /**
     * Sync current IDE state to React
     *
     * This fetches the current state from IDE and broadcasts it to React.
     * Use this when you want to ensure React has the latest state.
     */
    fun syncToReact() {
        if (isSyncing.getAndSet(true)) {
            log.debug("Sync already in progress, skipping")
            return
        }

        scope.launch {
            try {
                val manager = stateManager
                if (manager == null) {
                    log.warn("StateManager not initialized, cannot sync")
                    return@launch
                }

                // Get current state and broadcast to React
                val currentState = manager.getState()
                bridgeHandler?.updateState(currentState.filterValues { it != null }.mapValues { it.value!! })

                log.debug("Synced IDE state to React: ${currentState.keys}")
            } catch (e: Exception) {
                log.error("Error syncing to React", e)
            } finally {
                isSyncing.set(false)
            }
        }
    }

    /**
     * Sync current settings to React
     *
     * This refreshes settings from KaitenSettingsState and syncs to React.
     */
    fun syncSettings() {
        scope.launch {
            try {
                stateManager?.refreshSettings()
                log.debug("Settings synced to React")
            } catch (e: Exception) {
                log.error("Error syncing settings", e)
            }
        }
    }

    /**
     * Sync current file selection to React
     *
     * Gets the currently selected file from FileEditorManager and syncs to React.
     */
    fun syncCurrentFileSelection() {
        scope.launch {
            try {
                val fileEditorManager = FileEditorManager.getInstance(project)
                val selectedFile = fileEditorManager.selectedFiles.firstOrNull()
                syncSelectedFile(selectedFile)
            } catch (e: Exception) {
                log.error("Error syncing current file selection", e)
            }
        }
    }

    /**
     * Reconcile state between IDE and React
     *
     * This performs a full state sync to ensure consistency.
     * Called periodically and can also be called manually when needed.
     */
    fun reconcileState() {
        if (isSyncing.get()) {
            log.debug("Sync in progress, skipping reconciliation")
            return
        }

        scope.launch {
            try {
                log.debug("Starting state reconciliation")

                // Refresh all state from IDE sources
                stateManager?.refreshSettings()

                // Sync current file selection
                val fileEditorManager = FileEditorManager.getInstance(project)
                val selectedFile = fileEditorManager.selectedFiles.firstOrNull()
                stateManager?.updateSelectedFile(selectedFile?.path)

                // Update project path (in case project was moved)
                stateManager?.updateProjectPath(project.basePath)

                log.debug("State reconciliation completed")
            } catch (e: Exception) {
                log.error("Error during state reconciliation", e)
            }
        }
    }

    /**
     * Force a full state refresh and sync to React
     *
     * Use this when you know state might be out of sync and want to force a refresh.
     */
    fun forceRefresh() {
        scope.launch {
            try {
                log.info("Force refreshing state")

                // Reset and reinitialize state
                stateManager?.reset()

                // Reconcile to sync everything
                reconcileState()

                log.info("Force refresh completed")
            } catch (e: Exception) {
                log.error("Error during force refresh", e)
            }
        }
    }

    /**
     * Check if the sync service is initialized and ready
     *
     * @return True if service is initialized with bridge and state manager
     */
    fun isReady(): Boolean {
        return isInitialized.get() && bridgeHandler != null && stateManager != null
    }

    /**
     * Dispose the service (cleanup)
     */
    fun dispose() {
        reconciliationJob?.cancel()
        scope.cancel()
        isInitialized.set(false)
        bridgeHandler = null
        stateManager = null
        log.info("StateSyncService disposed")
    }

    companion object {
        /**
         * Get StateSyncService instance for project
         *
         * @param project Project instance
         * @return StateSyncService instance
         */
        fun getInstance(project: Project): StateSyncService =
            project.getService(StateSyncService::class.java)
    }
}
