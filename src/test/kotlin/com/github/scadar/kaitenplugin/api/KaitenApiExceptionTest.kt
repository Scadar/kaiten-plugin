package com.github.scadar.kaitenplugin.api

import org.junit.Assert.assertEquals
import org.junit.Test

class KaitenApiExceptionTest {

    // ─── default messages ────────────────────────────────────────────────────

    @Test
    fun `Unauthorized has correct default message`() {
        assertEquals("Unauthorized: Invalid token", KaitenApiException.Unauthorized().message)
    }

    @Test
    fun `Forbidden has correct default message`() {
        assertEquals("Forbidden: Insufficient permissions", KaitenApiException.Forbidden().message)
    }

    @Test
    fun `NotFound has correct default message`() {
        assertEquals("Resource not found", KaitenApiException.NotFound().message)
    }

    @Test
    fun `ServerError has correct default message`() {
        assertEquals("Server error occurred", KaitenApiException.ServerError().message)
    }

    @Test
    fun `NetworkError has correct default message`() {
        assertEquals("Network error occurred", KaitenApiException.NetworkError().message)
    }

    @Test
    fun `TimeoutError has correct default message`() {
        assertEquals("Request timeout", KaitenApiException.TimeoutError().message)
    }

    // ─── custom messages ─────────────────────────────────────────────────────

    @Test
    fun `Unauthorized accepts custom message`() {
        assertEquals("custom msg", KaitenApiException.Unauthorized("custom msg").message)
    }

    @Test
    fun `ServerError accepts custom message`() {
        assertEquals("DB unavailable", KaitenApiException.ServerError("DB unavailable").message)
    }

    // ─── exhaustive when ─────────────────────────────────────────────────────

    @Test
    fun `sealed class when expression covers all subtypes`() {
        val exceptions: List<KaitenApiException> = listOf(
            KaitenApiException.Unauthorized(),
            KaitenApiException.Forbidden(),
            KaitenApiException.NotFound(),
            KaitenApiException.ServerError(),
            KaitenApiException.NetworkError(),
            KaitenApiException.TimeoutError(),
        )
        val labels = exceptions.map { e ->
            when (e) {
                is KaitenApiException.Unauthorized -> "unauthorized"
                is KaitenApiException.Forbidden    -> "forbidden"
                is KaitenApiException.NotFound     -> "not_found"
                is KaitenApiException.ServerError  -> "server_error"
                is KaitenApiException.NetworkError -> "network_error"
                is KaitenApiException.TimeoutError -> "timeout"
            }
        }
        assertEquals(
            listOf("unauthorized", "forbidden", "not_found", "server_error", "network_error", "timeout"),
            labels
        )
    }
}
