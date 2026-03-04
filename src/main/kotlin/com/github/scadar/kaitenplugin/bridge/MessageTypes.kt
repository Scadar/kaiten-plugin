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

data class ErrorDetails(
    val message: String,
    val stack: String? = null,
    val componentStack: String? = null,
    val errorBoundary: String? = null,
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
    const val LIST_BRANCHES           = "listBranches"
    const val CREATE_BRANCH           = "createBranch"
}

// ============================================================================
// Event Names
// ============================================================================

object EventNames {
    const val THEME_CHANGED = "theme:changed"
}

