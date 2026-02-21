package com.github.scadar.kaitenplugin.bridge

import com.google.gson.annotations.SerializedName

/**
 * Kotlin type definitions for JCEF Bridge communication
 * These types mirror the TypeScript definitions for type-safe messaging between React and IDE
 */

// ============================================================================
// Base Message Types
// ============================================================================

/**
 * Base structure for all messages passed through the bridge
 */
interface BaseMessage {
    val type: String
    val timestamp: Long
}

/**
 * Message types for different communication patterns
 */
enum class MessageType {
    @SerializedName("rpc_request")
    RPC_REQUEST,

    @SerializedName("rpc_response")
    RPC_RESPONSE,

    @SerializedName("rpc_error")
    RPC_ERROR,

    @SerializedName("event")
    EVENT,

    @SerializedName("state:update")
    STATE_UPDATE,

    @SerializedName("state:sync")
    STATE_SYNC,

    @SerializedName("error:report")
    ERROR_REPORT,

    @SerializedName("bridge:ready")
    BRIDGE_READY,

    @SerializedName("bridge:ping")
    BRIDGE_PING,

    @SerializedName("bridge:pong")
    BRIDGE_PONG
}

// ============================================================================
// RPC (Request/Response) Pattern
// ============================================================================

/**
 * RPC request from React to IDE
 */
data class RPCRequest(
    override val type: String = "rpc_request",
    override val timestamp: Long,
    val id: String, // UUID for matching request/response
    val method: String,
    val params: Any?
) : BaseMessage

/**
 * RPC successful response from IDE to React
 */
data class RPCResponse<T>(
    override val type: String = "rpc_response",
    override val timestamp: Long,
    val id: String, // Matches request ID
    val result: T
) : BaseMessage

/**
 * Error details for RPC error response
 */
data class RPCErrorDetails(
    val code: String,
    val message: String,
    val details: Any? = null
)

/**
 * RPC error response from IDE to React
 */
data class RPCError(
    override val type: String = "rpc_error",
    override val timestamp: Long,
    val id: String, // Matches request ID
    val error: RPCErrorDetails
) : BaseMessage

// ============================================================================
// Event Bus Pattern
// ============================================================================

/**
 * Event message for pub/sub pattern (IDE → React)
 */
data class EventMessage<T>(
    override val type: String = "event",
    override val timestamp: Long,
    val event: String, // Event name (e.g., 'task:updated', 'settings:changed')
    val payload: T
) : BaseMessage

// ============================================================================
// State Synchronization Pattern
// ============================================================================

/**
 * User state structure
 */
data class UserState(
    val id: String?,
    val name: String?,
    val email: String?
)

/**
 * Application state structure
 */
data class AppState(
    val projectPath: String?,
    val selectedFile: String?,
    val settings: Map<String, Any>,
    val user: UserState?,
    val tasks: List<Any>,
    val filters: Map<String, Any>
)

/**
 * State update message from IDE to React
 */
data class StateUpdateMessage(
    override val type: String = "state:update",
    override val timestamp: Long,
    val updates: Map<String, Any> // Partial AppState represented as map
) : BaseMessage

/**
 * State sync message from React to IDE
 */
data class StateSyncMessage(
    override val type: String = "state:sync",
    override val timestamp: Long,
    val changes: Map<String, Any> // Partial AppState represented as map
) : BaseMessage

// ============================================================================
// Error Reporting Pattern
// ============================================================================

/**
 * Error severity levels
 */
enum class ErrorSeverity {
    @SerializedName("fatal")
    FATAL,

    @SerializedName("error")
    ERROR,

    @SerializedName("warning")
    WARNING,

    @SerializedName("info")
    INFO
}

/**
 * Error details for error report
 */
data class ErrorDetails(
    val message: String,
    val stack: String? = null,
    val componentStack: String? = null,
    val errorBoundary: String? = null,
    val severity: ErrorSeverity,
    val context: Map<String, Any>? = null
)

/**
 * Error report message from React to IDE
 */
data class ErrorReportMessage(
    override val type: String = "error:report",
    override val timestamp: Long,
    val error: ErrorDetails
) : BaseMessage

// ============================================================================
// Bridge Lifecycle Messages
// ============================================================================

/**
 * Bridge source type
 */
enum class BridgeSource {
    @SerializedName("ide")
    IDE,

    @SerializedName("react")
    REACT
}

/**
 * Bridge ready handshake message
 */
data class BridgeReadyMessage(
    override val type: String = "bridge:ready",
    override val timestamp: Long,
    val source: BridgeSource,
    val version: String
) : BaseMessage

/**
 * Bridge ping message for connection health check
 */
data class BridgePingMessage(
    override val type: String = "bridge:ping",
    override val timestamp: Long,
    val id: String
) : BaseMessage

/**
 * Bridge pong response message
 */
data class BridgePongMessage(
    override val type: String = "bridge:pong",
    override val timestamp: Long,
    val id: String,
    val latency: Long? = null
) : BaseMessage

// ============================================================================
// Union Types
// ============================================================================

/**
 * Sealed class for all possible bridge messages
 * This mirrors the TypeScript BridgeMessage union type
 */
sealed class BridgeMessage {
    abstract val type: String
    abstract val timestamp: Long

    data class RpcRequest(val message: RPCRequest) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class RpcResponse(val message: RPCResponse<*>) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class RpcError(val message: com.github.scadar.kaitenplugin.bridge.RPCError) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class Event(val message: EventMessage<*>) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class StateUpdate(val message: StateUpdateMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class StateSync(val message: StateSyncMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class ErrorReport(val message: ErrorReportMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class BridgeReady(val message: BridgeReadyMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class BridgePing(val message: BridgePingMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }

    data class BridgePong(val message: BridgePongMessage) : BridgeMessage() {
        override val type: String get() = message.type
        override val timestamp: Long get() = message.timestamp
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Type guard to check if message is an RPC request
 */
fun isRPCRequest(message: BaseMessage): Boolean {
    return message.type == "rpc_request"
}

/**
 * Type guard to check if message is an RPC response
 */
fun isRPCResponse(message: BaseMessage): Boolean {
    return message.type == "rpc_response"
}

/**
 * Type guard to check if message is an RPC error
 */
fun isRPCError(message: BaseMessage): Boolean {
    return message.type == "rpc_error"
}

/**
 * Type guard to check if message is an event
 */
fun isEventMessage(message: BaseMessage): Boolean {
    return message.type == "event"
}

/**
 * Type guard to check if message is a state update
 */
fun isStateUpdate(message: BaseMessage): Boolean {
    return message.type == "state:update"
}

/**
 * Type guard to check if message is a state sync
 */
fun isStateSync(message: BaseMessage): Boolean {
    return message.type == "state:sync"
}

/**
 * Type guard to check if message is an error report
 */
fun isErrorReport(message: BaseMessage): Boolean {
    return message.type == "error:report"
}

/**
 * Type guard to check if message is a bridge ready message
 */
fun isBridgeReady(message: BaseMessage): Boolean {
    return message.type == "bridge:ready"
}

// ============================================================================
// RPC Method Definitions
// ============================================================================

/**
 * Available RPC method names that can be called from React
 */
object RPCMethodNames {
    const val GET_PROJECT_PATH = "getProjectPath"
    const val GET_SELECTED_FILE = "getSelectedFile"
    const val GET_STATE = "getState"
    const val GET_SETTING = "getSetting"
    const val SET_SETTING = "setSetting"
    const val GET_TASKS = "getTasks"
    const val GET_TASK = "getTask"
    const val GET_CURRENT_USER = "getCurrentUser"
}

/**
 * Parameter types for RPC methods
 */
sealed class RPCMethodParams {
    object NoParams : RPCMethodParams()
    data class GetSetting(val key: String) : RPCMethodParams()
    data class SetSetting(val key: String, val value: Any) : RPCMethodParams()
    data class GetTasks(val filters: Map<String, Any>? = null) : RPCMethodParams()
    data class GetTask(val id: String) : RPCMethodParams()
}

/**
 * Result types for RPC methods
 */
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

// ============================================================================
// Event Definitions
// ============================================================================

/**
 * Available event names that can be emitted from IDE to React
 */
object EventNames {
    const val TASK_CREATED = "task:created"
    const val TASK_UPDATED = "task:updated"
    const val TASK_DELETED = "task:deleted"
    const val SETTINGS_CHANGED = "settings:changed"
    const val USER_LOGIN = "user:login"
    const val USER_LOGOUT = "user:logout"
    const val PROJECT_OPENED = "project:opened"
    const val PROJECT_CLOSED = "project:closed"
    const val FILE_SELECTED = "file:selected"
}

/**
 * Payload types for different events
 */
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
