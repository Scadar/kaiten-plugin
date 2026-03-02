package com.github.scadar.kaitenplugin.bridge

import com.google.gson.Gson
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.intellij.openapi.diagnostic.logger
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
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
    private val messageSender = BridgeMessageSender(browser, gson)

    // RPC handler registry: method name -> handler function
    private val rpcHandlers = ConcurrentHashMap<String, suspend (Any?) -> Any?>()

    // Event listeners: event name -> list of listeners
    private val eventListeners = ConcurrentHashMap<String, MutableList<(JsonElement) -> Unit>>()

    // State sync callback
    private var stateSyncCallback: ((Map<String, Any>) -> Unit)? = null

    // Bridge state
    @Volatile
    private var isReady = false

    private val version = "1.0.0"

    init {
        setupBridge()
    }

    /**
     * Set up the JCEF bridge - create JBCefJSQuery and inject window functions
     *
     * window.__jcef_send__ is re-injected on every page load via CefLoadHandlerAdapter
     * so it is available both in production (file://) and dev mode (http://localhost:XXXX),
     * and survives Vite HMR full-page reloads.
     */
    private fun setupBridge() {
        try {
            // Create JBCefJSQuery for React → IDE messages.
            // The native binding (window.cefQuery_XXX) is automatically re-injected by JCEF
            // on every navigation, so we only need to create the query once.
            val query = JBCefJSQuery.create(browser as JBCefBrowserBase)

            query.addHandler { message ->
                try {
                    handleIncomingMessage(message)
                } catch (e: Exception) {
                    log.error("Error handling incoming message", e)
                }
                null // JBCefJSQuery handler must return null
            }

            // window.__jcef_send__ wraps the native JCEF query and must be re-injected
            // after every page load because executeJavaScript operates on the current page
            // context which is wiped on navigation.
            val injectScript = """
                window.__jcef_send__ = function(msg) {
                    ${query.inject("msg")}
                };
            """.trimIndent()

            browser.jbCefClient.addLoadHandler(
                object : CefLoadHandlerAdapter() {
                    override fun onLoadEnd(cefBrowser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                        if (!frame.isMain) return
                        // Reset ready state so a full page reload (e.g. Vite HMR) re-does the handshake.
                        isReady = false
                        cefBrowser.executeJavaScript(injectScript, frame.url, 0)
                        log.debug("Injected __jcef_send__ after page load: ${frame.url}")
                        // React initiates the handshake by sending bridge:ready.
                        // IDE responds in handleReadyHandshake(). No delay needed here.
                    }
                },
                browser.cefBrowser
            )

            log.info("JCEF Bridge initialized successfully")
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
        messageSender.send(message)
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
            messageSender.send(errorResponse)
            log.warn("RPC method not found: ${request.method}")
            return
        }

        try {
            // Execute handler
            val result = handler(request.params)

            // Send success response
            val response = RPCResponse(
                type = "rpc_response",
                timestamp = System.currentTimeMillis(),
                id = request.id,
                result = result
            )
            messageSender.send(response)
            log.debug("RPC request handled successfully: ${request.method}")
        } catch (e: Exception) {
            // Log full trace on JVM side; send only a sanitised message to React.
            log.error("Error executing RPC handler: ${request.method}", e)
            val errorResponse = RPCError(
                type = "rpc_error",
                timestamp = System.currentTimeMillis(),
                id = request.id,
                error = RPCErrorDetails(
                    code = "HANDLER_ERROR",
                    message = "Internal error executing '${request.method}'",
                    details = null
                )
            )
            messageSender.send(errorResponse)
        }
    }

    /**
     * Handle event from React
     */
    private fun handleEvent(json: JsonObject) {
        try {
            @Suppress("UNCHECKED_CAST")
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
            log.error("Error reported from React: ${message.error.message}", Throwable(message.error.stack ?: ""))
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
            messageSender.send(pong)
            log.debug("Responded to ping: ${message.id}")
        } catch (e: Exception) {
            log.error("Error handling ping", e)
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
        messageSender.send(message)
        log.debug("Emitted event: $event")
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
        messageSender.send(message)
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
     * Dispose the bridge (cleanup)
     */
    fun dispose() {
        rpcHandlers.clear()
        eventListeners.clear()
        stateSyncCallback = null
        scope.cancel()
        log.info("Bridge disposed")
    }
}
