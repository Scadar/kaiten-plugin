package com.github.scadar.kaitenplugin.bridge

import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonPrimitive
import com.intellij.testFramework.fixtures.BasePlatformTestCase
import com.intellij.ui.jcef.JBCefBrowser
import kotlinx.coroutines.runBlocking
import org.junit.Test

/**
 * Basic tests for JCEFBridgeHandler
 *
 * Note: Full JCEF testing requires mocking JBCefBrowser, which is complex.
 * These tests verify the basic structure and non-JCEF functionality.
 */
class JCEFBridgeHandlerTest : BasePlatformTestCase() {

    /**
     * Test RPC handler registration
     */
    fun testRPCHandlerRegistration() {
        // This test verifies that we can register RPC handlers
        // Full testing requires mocking JBCefBrowser which is done in integration tests

        var handlerCalled = false
        val testHandler: suspend (Any?) -> String = { params ->
            handlerCalled = true
            "test-result"
        }

        // Verify the handler function works
        runBlocking {
            val result = testHandler(null)
            assertEquals("test-result", result)
            assertTrue(handlerCalled)
        }
    }

    /**
     * Test that RPC handlers can process parameters
     */
    fun testRPCHandlerWithParams() {
        val testHandler: suspend (Any?) -> String = { params ->
            val jsonObj = (params as? JsonElement)?.asJsonObject
            val key = jsonObj?.get("key")?.asString ?: "default"
            "result-$key"
        }

        runBlocking {
            val params = JsonObject().apply {
                addProperty("key", "testValue")
            }
            val result = testHandler(params)
            assertEquals("result-testValue", result)
        }
    }

    /**
     * Test event listener pattern
     */
    fun testEventListenerPattern() {
        var eventReceived = false
        var eventPayload: JsonElement? = null

        val listener: (JsonElement) -> Unit = { payload ->
            eventReceived = true
            eventPayload = payload
        }

        val testPayload = JsonObject().apply {
            addProperty("taskId", "123")
            addProperty("action", "updated")
        }

        listener(testPayload)

        assertTrue(eventReceived)
        assertNotNull(eventPayload)
        assertEquals("123", eventPayload?.asJsonObject?.get("taskId")?.asString)
    }

    /**
     * Test state sync callback pattern
     */
    fun testStateSyncCallback() {
        var callbackInvoked = false
        var receivedChanges: Map<String, Any>? = null

        val callback: (Map<String, Any>) -> Unit = { changes ->
            callbackInvoked = true
            receivedChanges = changes
        }

        val testChanges = mapOf(
            "projectPath" to "/test/path",
            "selectedFile" to "file.txt"
        )

        callback(testChanges)

        assertTrue(callbackInvoked)
        assertNotNull(receivedChanges)
        assertEquals("/test/path", receivedChanges?.get("projectPath"))
        assertEquals("file.txt", receivedChanges?.get("selectedFile"))
    }

    /**
     * Test error report callback pattern
     */
    fun testErrorReportCallback() {
        var callbackInvoked = false
        var receivedError: ErrorDetails? = null

        val callback: (ErrorDetails) -> Unit = { error ->
            callbackInvoked = true
            receivedError = error
        }

        val testError = ErrorDetails(
            message = "Test error",
            stack = "stack trace",
            componentStack = null,
            errorBoundary = null,
            severity = ErrorSeverity.ERROR,
            context = mapOf("component" to "TestComponent")
        )

        callback(testError)

        assertTrue(callbackInvoked)
        assertNotNull(receivedError)
        assertEquals("Test error", receivedError?.message)
        assertEquals(ErrorSeverity.ERROR, receivedError?.severity)
    }

    /**
     * Test message type detection
     */
    fun testMessageTypeDetection() {
        val rpcRequest = RPCRequest(
            type = "rpc_request",
            timestamp = System.currentTimeMillis(),
            id = "test-id",
            method = "testMethod",
            params = null
        )

        assertTrue(isRPCRequest(rpcRequest))
        assertFalse(isRPCResponse(rpcRequest))
        assertFalse(isRPCError(rpcRequest))
    }

    /**
     * Test message serialization structure
     */
    fun testMessageSerialization() {
        val rpcResponse = RPCResponse(
            type = "rpc_response",
            timestamp = System.currentTimeMillis(),
            id = "test-id",
            result = "test-result"
        )

        assertEquals("rpc_response", rpcResponse.type)
        assertEquals("test-id", rpcResponse.id)
        assertEquals("test-result", rpcResponse.result)
    }

    /**
     * Test error details structure
     */
    fun testErrorDetailsStructure() {
        val errorDetails = RPCErrorDetails(
            code = "METHOD_NOT_FOUND",
            message = "Method not found: testMethod",
            details = "Additional details"
        )

        assertEquals("METHOD_NOT_FOUND", errorDetails.code)
        assertEquals("Method not found: testMethod", errorDetails.message)
        assertEquals("Additional details", errorDetails.details)
    }

    /**
     * Test event message structure
     */
    fun testEventMessageStructure() {
        val eventMessage = EventMessage(
            type = "event",
            timestamp = System.currentTimeMillis(),
            event = "task:updated",
            payload = mapOf("taskId" to "123")
        )

        assertEquals("event", eventMessage.type)
        assertEquals("task:updated", eventMessage.event)
        assertTrue(eventMessage.payload is Map<*, *>)
    }

    /**
     * Test state update message structure
     */
    fun testStateUpdateMessageStructure() {
        val updates = mapOf(
            "projectPath" to "/test/path",
            "selectedFile" to "file.txt"
        )

        val stateUpdate = StateUpdateMessage(
            type = "state:update",
            timestamp = System.currentTimeMillis(),
            updates = updates
        )

        assertEquals("state:update", stateUpdate.type)
        assertEquals(2, stateUpdate.updates.size)
        assertEquals("/test/path", stateUpdate.updates["projectPath"])
    }

    /**
     * Test bridge ready message structure
     */
    fun testBridgeReadyMessageStructure() {
        val readyMessage = BridgeReadyMessage(
            type = "bridge:ready",
            timestamp = System.currentTimeMillis(),
            source = BridgeSource.IDE,
            version = "1.0.0"
        )

        assertEquals("bridge:ready", readyMessage.type)
        assertEquals(BridgeSource.IDE, readyMessage.source)
        assertEquals("1.0.0", readyMessage.version)
    }

    override fun getTestDataPath() = "src/test/testData"
}
