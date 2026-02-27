package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.api.KaitenApiClient
import com.github.scadar.kaitenplugin.api.KaitenApiException
import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.github.scadar.kaitenplugin.settings.SettingsMapper
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.fileEditor.FileEditorManagerListener
import com.intellij.openapi.progress.ProcessCanceledException
import com.intellij.openapi.project.Project
import com.intellij.openapi.Disposable
import com.intellij.openapi.vfs.VirtualFile
import kotlinx.coroutines.*

/**
 * StateSyncService - Service to handle state synchronization via bridge
 *
 * This service orchestrates state synchronization between the IDE and React by:
 * - Initializing StateManager with bridge handler
 * - Listening to IDE events (file selection, settings changes) and syncing to React
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
    private var isInitialized = false

    // Periodic reconciliation job
    private var reconciliationJob: Job? = null

    // Reconciliation interval (60 seconds)
    private val reconciliationIntervalMs = 60_000L

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

        if (!isInitialized) {
            isInitialized = true
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
     * Push the latest settings from [KaitenSettingsState] to the React app immediately.
     *
     * Called after the IDE Settings dialog is applied so the UI updates without
     * waiting for the next periodic reconciliation cycle.
     */
    fun refreshSettings() {
        scope.launch {
            try {
                stateManager?.refreshSettings()
            } catch (e: Exception) {
                log.error("Error refreshing settings", e)
            }
        }
    }

    /**
     * Validate [url]/[token] credentials by calling the current-user endpoint once,
     * then push the result to the React UI.
     *
     * During the check, React receives `isVerifyingConnection = true` inside the
     * settings object so it can show a "Connecting…" state.  On completion the
     * regular settings map (without the transient flag) is pushed, carrying either
     * the authenticated [KaitenSettingsState.currentUserId] or the
     * [KaitenSettingsState.lastConnectionError] message.
     *
     * This method is fire-and-forget — callers don't need to await the result.
     */
    fun verifyConnectionAndRefresh(url: String, token: String) {
        scope.launch {
            log.info("Verifying connection to $url")

            // Immediately signal "checking" to React (transient flag, not persisted).
            val checkingMap = SettingsMapper.toMap(KaitenSettingsState.getInstance())
                .toMutableMap()
            checkingMap["isVerifyingConnection"] = true
            stateManager?.updateField("settings", checkingMap)

            val result = runCatching {
                val client = HttpClientProvider(token).createClient()
                KaitenApiClient(client, url).getCurrentUser()
            }

            // Write the outcome to persisted settings on EDT.
            withContext(Dispatchers.Main) {
                val s = KaitenSettingsState.getInstance()
                if (result.isSuccess) {
                    s.currentUserId = result.getOrThrow().id
                    s.lastConnectionError = ""
                    log.info("Connection verified, userId=${s.currentUserId}")
                } else {
                    s.currentUserId = null
                    s.lastConnectionError = when (val e = result.exceptionOrNull()) {
                        is KaitenApiException.Unauthorized -> "Неверный API токен"
                        is KaitenApiException.NetworkError -> "Ошибка сети: ${e.message}"
                        is KaitenApiException.TimeoutError -> "Превышено время ожидания"
                        else -> "Ошибка подключения: ${result.exceptionOrNull()?.message ?: "неизвестная ошибка"}"
                    }
                    log.warn("Connection verification failed: ${s.lastConnectionError}")
                }
            }

            // Push final settings (isVerifyingConnection absent = false).
            stateManager?.refreshSettings()
        }
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
    private fun syncSelectedFile(file: VirtualFile?) {
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

    override fun dispose() {
        reconciliationJob?.cancel()
        scope.cancel()
        isInitialized = false
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
