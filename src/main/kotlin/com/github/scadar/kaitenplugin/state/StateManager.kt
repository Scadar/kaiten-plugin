package com.github.scadar.kaitenplugin.state

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project
import java.util.concurrent.ConcurrentHashMap

/**
 * StateManager - IDE-side state manager for managing and broadcasting application state
 *
 * This service:
 * - Manages application state (AppState) on the IDE side
 * - Broadcasts state updates to React via JCEFBridgeHandler
 * - Integrates with KaitenSettingsState for settings data
 * - Supports bidirectional state synchronization
 * - Thread-safe state updates using ConcurrentHashMap
 *
 * State structure mirrors TypeScript AppState:
 * - projectPath: String?
 * - selectedFile: String?
 * - settings: Map<String, Any>
 * - user: UserInfo?
 * - tasks: List<Any>
 * - filters: Map<String, Any>
 */
@Service(Service.Level.PROJECT)
class StateManager(private val project: Project) {
    private val log = logger<StateManager>()

    // Application state - thread-safe
    private val state = ConcurrentHashMap<String, Any?>()

    // Reference to bridge handler (set during initialization)
    @Volatile
    private var bridgeHandler: JCEFBridgeHandler? = null

    // State change listeners
    private val stateChangeListeners = mutableListOf<(Map<String, Any?>) -> Unit>()

    init {
        // Initialize state with default values
        initializeState()
    }

    /**
     * Initialize state with default values from IDE
     */
    private fun initializeState() {
        val settingsState = KaitenSettingsState.getInstance()

        // Set initial state values (ConcurrentHashMap doesn't allow null values)
        // Use a sentinel value or skip null values
        project.basePath?.let { state["projectPath"] = it }
        // selectedFile is null by default, omit from map
        state["settings"] = buildSettingsMap(settingsState)
        buildUserInfo(settingsState)?.let { state["user"] = it }
        state["tasks"] = emptyList<Any>()
        state["filters"] = buildFiltersMap(settingsState)

        log.info("StateManager initialized for project: ${project.name}")
    }

    /**
     * Build settings map from KaitenSettingsState
     */
    private fun buildSettingsMap(settingsState: KaitenSettingsState): Map<String, Any?> {
        return mapOf(
            "serverUrl" to settingsState.serverUrl,
            "apiToken" to settingsState.apiToken,
            "selectedSpaceId" to settingsState.selectedSpaceId,
            "selectedBoardId" to settingsState.selectedBoardId,
            "selectedColumnIds" to settingsState.selectedColumnIds.toList(),
            "filterByAssignee" to settingsState.filterByAssignee,
            "filterByParticipant" to settingsState.filterByParticipant,
            "filterLogic" to settingsState.filterLogic,
            "viewMode" to settingsState.viewMode,
            "skipSslVerification" to settingsState.skipSslVerification
        )
    }

    /**
     * Build user info from KaitenSettingsState
     */
    private fun buildUserInfo(settingsState: KaitenSettingsState): Map<String, Any?>? {
        val userId = settingsState.currentUserId
        return if (userId != null) {
            mapOf(
                "id" to userId.toString(),
                "name" to null, // Can be populated from API
                "email" to null // Can be populated from API
            )
        } else {
            null
        }
    }

    /**
     * Build filters map from KaitenSettingsState
     */
    private fun buildFiltersMap(settingsState: KaitenSettingsState): Map<String, Any?> {
        return mapOf(
            "byAssignee" to settingsState.filterByAssignee,
            "byParticipant" to settingsState.filterByParticipant,
            "logic" to settingsState.filterLogic,
            "spaceId" to settingsState.selectedSpaceId,
            "boardId" to settingsState.selectedBoardId,
            "columnIds" to settingsState.selectedColumnIds.toList()
        )
    }

    /**
     * Set the bridge handler for broadcasting state updates
     *
     * @param handler JCEFBridgeHandler instance
     */
    fun setBridgeHandler(handler: JCEFBridgeHandler) {
        this.bridgeHandler = handler

        // Register callback for state sync from React
        handler.onStateSync { changes ->
            handleStateSyncFromReact(changes)
        }

        // Send initial state to React
        broadcastStateUpdate(getState())

        log.info("Bridge handler set and state sync configured")
    }

    /**
     * Get current state as map
     *
     * @return Current application state (includes null for missing required keys)
     */
    fun getState(): Map<String, Any?> {
        // Start with all current state
        val result = state.toMap().toMutableMap()

        // Ensure required keys are present (even if null)
        val requiredKeys = listOf("projectPath", "selectedFile", "settings", "user", "tasks", "filters")
        requiredKeys.forEach { key ->
            if (!result.containsKey(key)) {
                result[key] = null
            }
        }

        return result
    }

    /**
     * Update state with partial updates and broadcast to React
     *
     * @param updates Partial state updates
     */
    fun updateState(updates: Map<String, Any?>) {
        if (updates.isEmpty()) {
            return
        }

        // Update state (ConcurrentHashMap doesn't allow null values)
        // null values will remove the key from the map
        updates.forEach { (key, value) ->
            if (value == null) {
                state.remove(key)
            } else {
                state[key] = value
            }
        }

        log.debug("State updated: ${updates.keys}")

        // Broadcast to React
        broadcastStateUpdate(updates)

        // Notify listeners
        notifyStateChangeListeners(updates)
    }

    /**
     * Update a single state field
     *
     * @param key State field key
     * @param value New value
     */
    fun updateField(key: String, value: Any?) {
        updateState(mapOf(key to value))
    }

    /**
     * Update project path (e.g., when project changes)
     *
     * @param path New project path
     */
    fun updateProjectPath(path: String?) {
        updateField("projectPath", path)
    }

    /**
     * Update selected file
     *
     * @param filePath Selected file path
     */
    fun updateSelectedFile(filePath: String?) {
        updateField("selectedFile", filePath)
    }

    /**
     * Update settings from KaitenSettingsState
     */
    fun refreshSettings() {
        val settingsState = KaitenSettingsState.getInstance()
        updateState(mapOf(
            "settings" to buildSettingsMap(settingsState),
            "user" to buildUserInfo(settingsState),
            "filters" to buildFiltersMap(settingsState)
        ))
    }

    /**
     * Update tasks list
     *
     * @param tasks New tasks list
     */
    fun updateTasks(tasks: List<Any>) {
        updateField("tasks", tasks)
    }

    /**
     * Update filters
     *
     * @param filters New filters map
     */
    fun updateFilters(filters: Map<String, Any?>) {
        updateField("filters", filters)
    }

    /**
     * Update user information
     *
     * @param user User info map (id, name, email)
     */
    fun updateUser(user: Map<String, Any?>?) {
        updateField("user", user)
    }

    /**
     * Broadcast state update to React via bridge
     *
     * @param updates State updates to broadcast
     */
    private fun broadcastStateUpdate(updates: Map<String, Any?>) {
        val handler = bridgeHandler
        if (handler == null) {
            log.debug("Bridge handler not set, skipping state broadcast")
            return
        }

        try {
            // Filter out null values for bridge (which expects Map<String, Any>)
            val nonNullUpdates = updates.filterValues { it != null }.mapValues { it.value!! }
            handler.updateState(nonNullUpdates)
            log.debug("State broadcasted to React: ${updates.keys}")
        } catch (e: Exception) {
            log.error("Error broadcasting state update", e)
        }
    }

    /**
     * Handle state sync from React
     *
     * @param changes State changes from React
     */
    private fun handleStateSyncFromReact(changes: Map<String, Any>) {
        log.debug("State sync from React: ${changes.keys}")

        // Update state (but don't broadcast back to avoid circular updates)
        // Note: changes from React won't have null values
        changes.forEach { (key, value) ->
            state[key] = value
        }

        // Handle specific field updates that need IDE-side actions
        if (changes.containsKey("settings")) {
            @Suppress("UNCHECKED_CAST")
            val settings = changes["settings"] as? Map<String, Any>
            if (settings != null) {
                syncSettingsToIDE(settings)
            }
        }

        // Notify listeners
        notifyStateChangeListeners(changes)
    }

    /**
     * Sync settings changes from React to IDE (KaitenSettingsState)
     *
     * @param settings Settings map from React
     */
    private fun syncSettingsToIDE(settings: Map<String, Any>) {
        val settingsState = KaitenSettingsState.getInstance()

        // Update settings state
        (settings["serverUrl"] as? String)?.let { settingsState.serverUrl = it }
        (settings["apiToken"] as? String)?.let { settingsState.apiToken = it }
        (settings["selectedSpaceId"] as? Number)?.let { settingsState.selectedSpaceId = it.toLong() }
        (settings["selectedBoardId"] as? Number)?.let { settingsState.selectedBoardId = it.toLong() }
        (settings["filterByAssignee"] as? Boolean)?.let { settingsState.filterByAssignee = it }
        (settings["filterByParticipant"] as? Boolean)?.let { settingsState.filterByParticipant = it }
        (settings["filterLogic"] as? String)?.let { settingsState.filterLogic = it }
        (settings["viewMode"] as? String)?.let { settingsState.viewMode = it }
        (settings["skipSslVerification"] as? Boolean)?.let { settingsState.skipSslVerification = it }

        @Suppress("UNCHECKED_CAST")
        (settings["selectedColumnIds"] as? List<Number>)?.let {
            settingsState.selectedColumnIds = it.map { id -> id.toLong() }.toMutableSet()
        }

        log.debug("Settings synced to IDE")
    }

    /**
     * Add a state change listener
     *
     * @param listener Listener function that receives state changes
     */
    fun addStateChangeListener(listener: (Map<String, Any?>) -> Unit) {
        stateChangeListeners.add(listener)
    }

    /**
     * Remove a state change listener
     *
     * @param listener Listener to remove
     */
    fun removeStateChangeListener(listener: (Map<String, Any?>) -> Unit) {
        stateChangeListeners.remove(listener)
    }

    /**
     * Notify all state change listeners
     *
     * @param changes State changes
     */
    private fun notifyStateChangeListeners(changes: Map<String, Any?>) {
        stateChangeListeners.forEach { listener ->
            try {
                listener(changes)
            } catch (e: Exception) {
                log.error("Error in state change listener", e)
            }
        }
    }

    /**
     * Reset state to initial values
     */
    fun reset() {
        state.clear()
        initializeState()
        broadcastStateUpdate(getState())
        log.info("State reset to initial values")
    }

    companion object {
        /**
         * Get StateManager instance for project
         *
         * @param project Project instance
         * @return StateManager instance
         */
        fun getInstance(project: Project): StateManager =
            project.getService(StateManager::class.java)
    }
}
