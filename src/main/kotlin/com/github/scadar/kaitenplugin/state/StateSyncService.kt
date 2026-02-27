package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.Disposable
import com.intellij.openapi.vfs.VirtualFile
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
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
class StateSyncService(private val project: Project) : Disposable {
    private val log = logger<StateSyncService>()
    private val scope = CoroutineScope(Dispatchers.Default + SupervisorJob())

    // Bridge and state manager references
    @Volatile
    private var bridgeHandler: JCEFBridgeHandler? = null

    @Volatile
    private var stateManager: StateManager? = null

    // Service state
    private val isInitialized = AtomicBoolean(false)

    // Conflated channel: keeps only the latest pending sync signal.
    private val syncChannel = Channel<Unit>(capacity = Channel.CONFLATED)

    // Periodic reconciliation job
    private var reconciliationJob: Job? = null

    // Reconciliation interval (60 seconds)
    private val reconciliationIntervalMs = 60_000L

    init {
        log.info("StateSyncService initialized for project: ${project.name}")
        // Single consumer for syncToReact signals.
        scope.launch {
            for (trigger in syncChannel) {
                try { doSyncToReact() }
                catch (e: ProcessCanceledException) { throw e }
                catch (e: Exception) { log.error("Error syncing to React", e) }
            }
        }
    }

    /**
     * Initialize the sync service with bridge handler and state manager
     *
     * This should be called once the JCEF bridge is ready and StateManager is available.
     *
     * @param bridge JCEFBridgeHandler instance
     */
    fun initialize(bridge: JCEFBridgeHandler) {
        // Cancel existing reconciliation so it doesn't target the old (possibly disposed) bridge.
        reconciliationJob?.cancel()

        bridgeHandler = bridge
        stateManager = StateManager.getInstance(project).also { it.setBridgeHandler(bridge) }

        if (!isInitialized.getAndSet(true)) {
            // Set up subscriptions only once — they are tied to the project-level scope.
            setupFileSelectionListener()
            setupSettingsChangeListener()
        }

        // Start fresh reconciliation loop targeting the new bridge.
        startPeriodicReconciliation()

        log.info("StateSyncService (re)initialized")
    }

    /**
     * Set up file selection listener to sync selected file to React
     */
    private fun setupFileSelectionListener() {
        project.messageBus.connect(scope).subscribe(
            FileEditorManagerListener.FILE_EDITOR_MANAGER,
            object : FileEditorManagerListener {
                override fun selectionChanged(event: com.intellij.openapi.fileEditor.FileEditorManagerEvent) {
                    scope.launch { syncSelectedFile(event.newFile) }
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
     * Start periodic state reconciliation to prevent desync.
     *
     * Every 60 seconds a full state sync is performed. Uses [doReconcileState] directly
     * (no nested launch) to keep the structured concurrency tree clean.
     */
    private fun startPeriodicReconciliation() {
        reconciliationJob = scope.launch {
            while (isActive) {
                delay(reconciliationIntervalMs)
                try {
                    doReconcileState()
                } catch (e: ProcessCanceledException) {
                    throw e
                } catch (e: Exception) {
                    log.error("Error during periodic reconciliation", e)
                }
            }
        }

        log.debug("Periodic reconciliation started (interval: ${reconciliationIntervalMs}ms)")
    }

    /**
     * Sync selected file to React.
     */
    private suspend fun syncSelectedFile(file: VirtualFile?) {
        try {
            val filePath = file?.path
            stateManager?.updateSelectedFile(filePath)
            log.debug("Synced selected file: $filePath")
        } catch (e: ProcessCanceledException) {
            throw e
        } catch (e: Exception) {
            log.error("Error syncing selected file", e)
        }
    }

    /**
     * Core reconciliation logic — must be called from within a coroutine.
     *
     * FIX: [FileEditorManager.getSelectedFiles] must run on EDT.
     * We switch to [Dispatchers.Main] only for that single call, then return to Default.
     */
    private suspend fun doReconcileState() {
        log.debug("Starting state reconciliation")

        stateManager?.refreshSettings()
        stateManager?.updateProjectPath(project.basePath)

        // FileEditorManager.getSelectedFiles() accesses EDT-only internal state.
        val selectedFile = withContext(Dispatchers.Main) {
            if (project.isDisposed) null
            else FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
        }
        syncSelectedFile(selectedFile)

        log.debug("State reconciliation completed")
    }

    /**
     * Sync current IDE state to React.
     *
     * Uses a CONFLATED channel so rapid successive calls collapse into a single sync.
     */
    fun syncToReact() {
        syncChannel.trySend(Unit)
    }

    private suspend fun doSyncToReact() {
        val manager = stateManager ?: run {
            log.warn("StateManager not initialized, cannot sync")
            return
        }
        val currentState = manager.getState()
        bridgeHandler?.updateState(currentState.filterValues { it != null }.mapValues { it.value!! })
        log.debug("Synced IDE state to React: ${currentState.keys}")
    }

    /**
     * Sync current settings to React.
     */
    fun syncSettings() {
        scope.launch {
            try {
                stateManager?.refreshSettings()
                log.debug("Settings synced to React")
            } catch (e: ProcessCanceledException) {
                throw e
            } catch (e: Exception) {
                log.error("Error syncing settings", e)
            }
        }
    }

    /**
     * Sync current file selection to React.
     *
     * FIX: [FileEditorManager.getSelectedFiles] moved to [Dispatchers.Main] (EDT).
     */
    fun syncCurrentFileSelection() {
        scope.launch {
            try {
                val selectedFile = withContext(Dispatchers.Main) {
                    if (project.isDisposed) null
                    else FileEditorManager.getInstance(project).selectedFiles.firstOrNull()
                }
                syncSelectedFile(selectedFile)
            } catch (e: ProcessCanceledException) {
                throw e
            } catch (e: Exception) {
                log.error("Error syncing current file selection", e)
            }
        }
    }

    /**
     * Reconcile state between IDE and React.
     *
     * Can be called from any thread — launches a coroutine that calls [doReconcileState].
     */
    fun reconcileState() {
        scope.launch {
            try {
                doReconcileState()
            } catch (e: ProcessCanceledException) {
                throw e
            } catch (e: Exception) {
                log.error("Error during state reconciliation", e)
            }
        }
    }

    /**
     * Force a full state refresh and sync to React.
     */
    fun forceRefresh() {
        scope.launch {
            try {
                log.info("Force refreshing state")
                stateManager?.reset()
                doReconcileState()
                log.info("Force refresh completed")
            } catch (e: ProcessCanceledException) {
                throw e
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

    override fun dispose() {
        syncChannel.close()
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
