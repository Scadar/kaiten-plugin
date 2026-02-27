package com.github.scadar.kaitenplugin.bridge

import com.google.gson.annotations.SerializedName

/**
 * Kotlin type definitions for JCEF Bridge communication.
 * These types mirror the TypeScript definitions for type-safe messaging between React and IDE.
 */

// ============================================================================
// Base Message Types
// ============================================================================

interface BaseMessage {
    val type: String
    val timestamp: Long
}

enum class MessageType {
    @SerializedName("rpc_request")  RPC_REQUEST,
    @SerializedName("rpc_response") RPC_RESPONSE,
    @SerializedName("rpc_error")    RPC_ERROR,
    @SerializedName("event")        EVENT,
    @SerializedName("state:update") STATE_UPDATE,
    @SerializedName("state:sync")   STATE_SYNC,
    @SerializedName("error:report") ERROR_REPORT,
    @SerializedName("bridge:ready") BRIDGE_READY,
    @SerializedName("bridge:ping")  BRIDGE_PING,
    @SerializedName("bridge:pong")  BRIDGE_PONG
}

// ============================================================================
// RPC (Request / Response) Pattern
// ============================================================================

data class RPCRequest(
    override val type: String = "rpc_request",
    override val timestamp: Long,
    val id: String,     // UUID for matching request/response
    val method: String,
    val params: Any?
) : BaseMessage

data class RPCResponse<T>(
    override val type: String = "rpc_response",
    override val timestamp: Long,
    val id: String,     // Matches request ID
    val result: T
) : BaseMessage

data class RPCErrorDetails(
    val code: String,
    val message: String,
    val details: Any? = null
)

data class RPCError(
    override val type: String = "rpc_error",
    override val timestamp: Long,
    val id: String,     // Matches request ID
    val error: RPCErrorDetails
) : BaseMessage

// ============================================================================
// Event Bus Pattern
// ============================================================================

data class EventMessage<T>(
    override val type: String = "event",
    override val timestamp: Long,
    val event: String,  // e.g. "task:updated", "settings:changed"
    val payload: T
) : BaseMessage

// ============================================================================
// State Synchronisation Pattern
// ============================================================================

data class UserState(
    val id: String?,
    val name: String?,
    val email: String?
)

data class AppState(
    val projectPath: String?,
    val selectedFile: String?,
    val settings: Map<String, Any>,
    val user: UserState?,
    val tasks: List<Any>,
    val filters: Map<String, Any>
)

data class StateUpdateMessage(
    override val type: String = "state:update",
    override val timestamp: Long,
    val updates: Map<String, Any>   // Partial AppState as map
) : BaseMessage

data class StateSyncMessage(
    override val type: String = "state:sync",
    override val timestamp: Long,
    val changes: Map<String, Any>   // Partial AppState as map
) : BaseMessage

// ============================================================================
// Error Reporting Pattern
// ============================================================================

enum class ErrorSeverity {
    @SerializedName("fatal")   FATAL,
    @SerializedName("error")   ERROR,
    @SerializedName("warning") WARNING,
    @SerializedName("info")    INFO
}

data class ErrorDetails(
    val message: String,
    val stack: String? = null,
    val componentStack: String? = null,
    val errorBoundary: String? = null,
    val severity: ErrorSeverity,
    val context: Map<String, Any>? = null
)

data class ErrorReportMessage(
    override val type: String = "error:report",
    override val timestamp: Long,
    val error: ErrorDetails
) : BaseMessage

// ============================================================================
// Bridge Lifecycle Messages
// ============================================================================

enum class BridgeSource {
    @SerializedName("ide")   IDE,
    @SerializedName("react") REACT
}

data class BridgeReadyMessage(
    override val type: String = "bridge:ready",
    override val timestamp: Long,
    val source: BridgeSource,
    val version: String
) : BaseMessage

data class BridgePingMessage(
    override val type: String = "bridge:ping",
    override val timestamp: Long,
    val id: String
) : BaseMessage

data class BridgePongMessage(
    override val type: String = "bridge:pong",
    override val timestamp: Long,
    val id: String,
    val latency: Long? = null
) : BaseMessage

// ============================================================================
// Sealed Union of All Bridge Messages
// ============================================================================

sealed class BridgeMessage {
    abstract val type: String
    abstract val timestamp: Long

    data class RpcRequest(val message: RPCRequest)          : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class RpcResponse(val message: RPCResponse<*>)     : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class RpcError(val message: RPCError)              : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class Event(val message: EventMessage<*>)          : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class StateUpdate(val message: StateUpdateMessage) : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class StateSync(val message: StateSyncMessage)     : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class ErrorReport(val message: ErrorReportMessage) : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class BridgeReady(val message: BridgeReadyMessage) : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class BridgePing(val message: BridgePingMessage)   : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
    data class BridgePong(val message: BridgePongMessage)   : BridgeMessage() { override val type get() = message.type; override val timestamp get() = message.timestamp }
}

// ============================================================================
// RPC Method Names — single source of truth for all handler registrations
// ============================================================================

/**
 * Available RPC method names callable from React.
 * Used in [com.github.scadar.kaitenplugin.ui.IdeRpcHandlerRegistry] for registration
 * and serves as documentation for the React side.
 */
object RPCMethodNames {
    // Project
    const val GET_PROJECT_PATH  = "getProjectPath"
    const val GET_SELECTED_FILE = "getSelectedFile"
    const val GET_PROJECT_NAME  = "getProjectName"
    const val OPEN_FILE         = "openFile"
    const val OPEN_URL          = "openUrl"
    const val SHOW_NOTIFICATION = "showNotification"

    // Settings
    const val GET_SETTINGS    = "getSettings"
    const val UPDATE_SETTINGS = "updateSettings"
    const val OPEN_SETTINGS   = "openSettings"

    // IDE theme
    const val GET_IDE_THEME = "getIdeTheme"

    // Generic API proxy
    const val API_REQUEST = "apiRequest"

    // Branch time tracking
    const val GET_BRANCH_TIME_ENTRIES = "getBranchTimeEntries"
    const val GET_CURRENT_BRANCH      = "getCurrentBranch"
    const val CLEAR_BRANCH_ENTRIES    = "clearBranchEntries"

    // Git
    const val GET_GIT_LOG             = "getGitLog"
    const val CHECK_BRANCHES_MERGED   = "checkBranchesMerged"
}

// ============================================================================
// Event Names
// ============================================================================

object EventNames {
    const val THEME_CHANGED    = "theme:changed"
    const val TASK_CREATED     = "task:created"
    const val TASK_UPDATED     = "task:updated"
    const val TASK_DELETED     = "task:deleted"
    const val SETTINGS_CHANGED = "settings:changed"
    const val USER_LOGIN       = "user:login"
    const val USER_LOGOUT      = "user:logout"
    const val PROJECT_OPENED   = "project:opened"
    const val PROJECT_CLOSED   = "project:closed"
    const val FILE_SELECTED    = "file:selected"
}

// ============================================================================
// Typed RPC Parameter / Result Models
// ============================================================================

sealed class RPCMethodParams {
    object NoParams : RPCMethodParams()
    data class GetSetting(val key: String) : RPCMethodParams()
    data class SetSetting(val key: String, val value: Any) : RPCMethodParams()
    data class GetTasks(val filters: Map<String, Any>? = null) : RPCMethodParams()
    data class GetTask(val id: String) : RPCMethodParams()
}

sealed class RPCMethodResult {
    data class ProjectPath(val path: String?) : RPCMethodResult()
    data class SelectedFile(val file: String?) : RPCMethodResult()
    data class State(val state: AppState) : RPCMethodResult()
    data class Setting(val value: Any?) : RPCMethodResult()
    object SettingUpdated : RPCMethodResult()
    data class Tasks(val tasks: List<Any>) : RPCMethodResult()
    data class Task(val task: Any?) : RPCMethodResult()
    data class CurrentUser(val user: UserState?) : RPCMethodResult()
}

sealed class EventPayload {
    data class TaskCreated(val taskId: String, val task: Any) : EventPayload()
    data class TaskUpdated(val taskId: String, val task: Any) : EventPayload()
    data class TaskDeleted(val taskId: String) : EventPayload()
    data class SettingsChanged(val key: String, val value: Any) : EventPayload()
    data class UserLogin(val userId: String, val userName: String) : EventPayload()
    object UserLogout : EventPayload()
    data class ProjectOpened(val projectPath: String) : EventPayload()
    object ProjectClosed : EventPayload()
    data class FileSelected(val filePath: String) : EventPayload()
}
