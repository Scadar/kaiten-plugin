package com.github.scadar.kaitenplugin.bridge

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.logger
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import kotlinx.coroutines.*
import java.util.concurrent.ConcurrentHashMap

/**
 * JCEFBridgeHandler - Kotlin-side bridge handler for IDE ↔ React communication
 *
 * This class handles bidirectional message passing between the IDE (JVM) and React (JCEF browser)
 * using JBCefJSQuery for React → IDE messages and executeJavaScript for IDE → React messages.
 *
 * Features:
 * - RPC pattern with request/response matching
 * - Event bus for pub/sub messaging
 * - State synchronization support
 * - Error reporting from React
 * - Ready-state handshake
 * - Type-safe message contracts via MessageTypes.kt
 */
class JCEFBridgeHandler(
    private val browser: JBCefBrowser,
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
) {
    private val log = logger<JCEFBridgeHandler>()
    private val gson = Gson()

    // RPC handler registry: method name -> handler function
    private val rpcHandlers = ConcurrentHashMap<String, suspend (Any?) -> Any?>()

    // Event listeners: event name -> list of listeners
    private val eventListeners = ConcurrentHashMap<String, MutableList<(JsonElement) -> Unit>>()

    // State sync callback
    private var stateSyncCallback: ((Map<String, Any>) -> Unit)? = null

    // Error report callback
    private var errorReportCallback: ((ErrorDetails) -> Unit)? = null

    // Bridge state
    @Volatile
    private var isReady = false

    private val version = "1.0.0"

    init {
        setupBridge()
    }

    /**
     * Set up the JCEF bridge - create JBCefJSQuery and inject window functions
     */
    private fun setupBridge() {
        try {
            // Create JBCefJSQuery for React → IDE messages
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)

            query.addHandler { message ->
                try {
                    handleIncomingMessage(message)
                } catch (e: Exception) {
                    log.error("Error handling incoming message", e)
                }
                null // JBCefJSQuery handler must return null
            }

            // Inject window.__jcef_send__ function into the page
            // This function will be called from React to send messages to IDE
            val injectScript = """
                window.__jcef_send__ = function(msg) {
                    ${query.inject("msg")}
                };
                console.log('[JCEFBridge] window.__jcef_send__ injected');
            """.trimIndent()

            browser.cefBrowser.executeJavaScript(
                injectScript,
                browser.cefBrowser.url,
                0
            )

            log.info("JCEF Bridge initialized successfully")

            // Send ready handshake to React after a short delay (to ensure React is loaded)
            scope.launch {
                delay(500) // Wait for React to initialize
                sendReadyHandshake()
            }
        } catch (e: Exception) {
            log.error("Failed to set up JCEF bridge", e)
        }
    }

    /**
     * Send ready handshake to React
     */
    private fun sendReadyHandshake() {
        val message = BridgeReadyMessage(
            type = "bridge:ready",
            timestamp = System.currentTimeMillis(),
            source = BridgeSource.IDE,
            version = version
        )
        sendToReact(message)
        isReady = true
        log.info("Sent ready handshake to React")
    }

    /**
     * Handle incoming message from React
     */
    private fun handleIncomingMessage(messageStr: String) {
        scope.launch {
            try {
                val jsonElement = gson.fromJson(messageStr, JsonElement::class.java)
                val jsonObject = jsonElement.asJsonObject
                val type = jsonObject.get("type")?.asString

                log.debug("Received message from React: type=$type")

                when (type) {
                    "rpc_request" -> handleRPCRequest(jsonObject)
                    "event" -> handleEvent(jsonObject)
                    "state:sync" -> handleStateSync(jsonObject)
                    "error:report" -> handleErrorReport(jsonObject)
                    "bridge:ready" -> handleReadyHandshake(jsonObject)
                    "bridge:ping" -> handlePing(jsonObject)
                    else -> log.warn("Unknown message type: $type")
                }
            } catch (e: Exception) {
                log.error("Error parsing incoming message: $messageStr", e)
            }
        }
    }

    /**
     * Handle RPC request from React
     */
    private suspend fun handleRPCRequest(json: JsonObject) {
        val request = try {
            gson.fromJson(json, RPCRequest::class.java)
        } catch (e: Exception) {
            log.error("Failed to parse RPC request", e)
            return
        }

        val handler = rpcHandlers[request.method]

        if (handler == null) {
            // Send error response - method not found
            val errorResponse = RPCError(
                type = "rpc_error",
                timestamp = System.currentTimeMillis(),
                id = request.id,
                error = RPCErrorDetails(
                    code = "METHOD_NOT_FOUND",
                    message = "RPC method not found: ${request.method}",
                    details = null
                )
            )
            sendToReact(errorResponse)
            log.warn("RPC method not found: ${request.method}")
            return
        }

        try {
            // Execute handler
            val result = handler(request.params)

            // Send success response
            val response = RPCResponse<Any?>(
                type = "rpc_response",
                timestamp = System.currentTimeMillis(),
                id = request.id,
                result = result
            )
            sendToReact(response)
            log.debug("RPC request handled successfully: ${request.method}")
        } catch (e: Exception) {
            // Send error response
            val errorResponse = RPCError(
                type = "rpc_error",
                timestamp = System.currentTimeMillis(),
                id = request.id,
                error = RPCErrorDetails(
                    code = "HANDLER_ERROR",
                    message = e.message ?: "Error executing RPC handler",
                    details = e.stackTraceToString()
                )
            )
            sendToReact(errorResponse)
            log.error("Error executing RPC handler: ${request.method}", e)
        }
    }

    /**
     * Handle event from React
     */
    private fun handleEvent(json: JsonObject) {
        try {
            val eventMessage = gson.fromJson(json, EventMessage::class.java) as EventMessage<JsonElement>
            val listeners = eventListeners[eventMessage.event]

            if (listeners.isNullOrEmpty()) {
                log.debug("No listeners for event: ${eventMessage.event}")
                return
            }

            listeners.forEach { listener ->
                try {
                    listener(eventMessage.payload)
                } catch (e: Exception) {
                    log.error("Error in event listener for ${eventMessage.event}", e)
                }
            }
        } catch (e: Exception) {
            log.error("Error handling event", e)
        }
    }

    /**
     * Handle state sync from React
     */
    private fun handleStateSync(json: JsonObject) {
        try {
            val message = gson.fromJson(json, StateSyncMessage::class.java)
            val callback = stateSyncCallback

            if (callback == null) {
                log.debug("No state sync callback registered")
                return
            }

            callback(message.changes)
            log.debug("State sync handled: ${message.changes.keys}")
        } catch (e: Exception) {
            log.error("Error handling state sync", e)
        }
    }

    /**
     * Handle error report from React
     */
    private fun handleErrorReport(json: JsonObject) {
        try {
            val message = gson.fromJson(json, ErrorReportMessage::class.java)
            val callback = errorReportCallback

            log.error("Error reported from React: ${message.error.message}", Throwable(message.error.stack ?: ""))

            callback?.invoke(message.error)
        } catch (e: Exception) {
            log.error("Error handling error report", e)
        }
    }

    /**
     * Handle ready handshake from React
     */
    private fun handleReadyHandshake(json: JsonObject) {
        try {
            val message = gson.fromJson(json, BridgeReadyMessage::class.java)
            if (message.source == BridgeSource.REACT) {
                log.info("React bridge ready (version: ${message.version})")
                // If we haven't sent our ready handshake yet, send it now
                if (!isReady) {
                    sendReadyHandshake()
                }
            }
        } catch (e: Exception) {
            log.error("Error handling ready handshake", e)
        }
    }

    /**
     * Handle ping from React
     */
    private fun handlePing(json: JsonObject) {
        try {
            val message = gson.fromJson(json, BridgePingMessage::class.java)
            val pong = BridgePongMessage(
                type = "bridge:pong",
                timestamp = System.currentTimeMillis(),
                id = message.id,
                latency = System.currentTimeMillis() - message.timestamp
            )
            sendToReact(pong)
            log.debug("Responded to ping: ${message.id}")
        } catch (e: Exception) {
            log.error("Error handling ping", e)
        }
    }

    /**
     * Send a message to React via executeJavaScript
     */
    private fun sendToReact(message: Any) {
        try {
            val messageJson = gson.toJson(message)
            // Escape single quotes in JSON for JavaScript string
            val escapedJson = messageJson.replace("'", "\\'")

            val script = "window.__jcef_receive__ && window.__jcef_receive__('$escapedJson');"

            browser.cefBrowser.executeJavaScript(
                script,
                browser.cefBrowser.url,
                0
            )

            log.debug("Sent message to React: ${message.javaClass.simpleName}")
        } catch (e: Exception) {
            log.error("Error sending message to React", e)
        }
    }

    // ============================================================================
    // Public API for IDE-side code
    // ============================================================================

    /**
     * Register an RPC handler for a specific method
     *
     * @param method RPC method name (e.g., "getProjectPath")
     * @param handler Handler function that takes params and returns a result
     *
     * @example
     * ```kotlin
     * bridge.registerRPC("getProjectPath") { params ->
     *     project.basePath
     * }
     * ```
     */
    fun registerRPC(method: String, handler: suspend (Any?) -> Any?) {
        rpcHandlers[method] = handler
        log.debug("Registered RPC handler: $method")
    }

    /**
     * Unregister an RPC handler
     *
     * @param method RPC method name
     */
    fun unregisterRPC(method: String) {
        rpcHandlers.remove(method)
        log.debug("Unregistered RPC handler: $method")
    }

    /**
     * Emit an event to React
     *
     * @param event Event name (e.g., "task:updated")
     * @param payload Event payload
     *
     * @example
     * ```kotlin
     * bridge.emitEvent("task:updated", mapOf("taskId" to "123", "task" to task))
     * ```
     */
    fun <T> emitEvent(event: String, payload: T) {
        val message = EventMessage(
            type = "event",
            timestamp = System.currentTimeMillis(),
            event = event,
            payload = payload
        )
        sendToReact(message)
        log.debug("Emitted event: $event")
    }

    /**
     * Subscribe to an event from React
     *
     * @param event Event name
     * @param listener Event listener function
     *
     * @example
     * ```kotlin
     * bridge.onEvent("user:action") { payload ->
     *     println("User action: $payload")
     * }
     * ```
     */
    fun onEvent(event: String, listener: (JsonElement) -> Unit) {
        eventListeners.getOrPut(event) { mutableListOf() }.add(listener)
        log.debug("Added event listener: $event")
    }

    /**
     * Send state update to React
     *
     * @param updates Partial state updates
     *
     * @example
     * ```kotlin
     * bridge.updateState(mapOf(
     *     "projectPath" to project.basePath,
     *     "selectedFile" to selectedFile
     * ))
     * ```
     */
    fun updateState(updates: Map<String, Any>) {
        val message = StateUpdateMessage(
            type = "state:update",
            timestamp = System.currentTimeMillis(),
            updates = updates
        )
        sendToReact(message)
        log.debug("Sent state update: ${updates.keys}")
    }

    /**
     * Register callback for state sync from React
     *
     * @param callback Callback function that receives state changes
     *
     * @example
     * ```kotlin
     * bridge.onStateSync { changes ->
     *     println("State changed: $changes")
     *     // Update IDE state
     * }
     * ```
     */
    fun onStateSync(callback: (Map<String, Any>) -> Unit) {
        stateSyncCallback = callback
        log.debug("Registered state sync callback")
    }

    /**
     * Register callback for error reports from React
     *
     * @param callback Callback function that receives error details
     *
     * @example
     * ```kotlin
     * bridge.onErrorReport { error ->
     *     log.error("React error: ${error.message}", Throwable(error.stack ?: ""))
     * }
     * ```
     */
    fun onErrorReport(callback: (ErrorDetails) -> Unit) {
        errorReportCallback = callback
        log.debug("Registered error report callback")
    }

    /**
     * Check if bridge is ready
     *
     * @return True if bridge handshake is complete
     */
    fun isReady(): Boolean = isReady

    /**
     * Dispose the bridge (cleanup)
     */
    fun dispose() {
        rpcHandlers.clear()
        eventListeners.clear()
        stateSyncCallback = null
        errorReportCallback = null
        scope.cancel()
        log.info("Bridge disposed")
    }
}
