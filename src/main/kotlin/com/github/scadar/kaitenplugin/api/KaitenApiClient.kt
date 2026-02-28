package com.github.scadar.kaitenplugin.api

import com.github.scadar.kaitenplugin.api.dto.*
import com.github.scadar.kaitenplugin.domain.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.intellij.openapi.diagnostic.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException
import java.lang.reflect.Type
import java.net.SocketTimeoutException

class KaitenApiClient(private val client: OkHttpClient, private val baseUrl: String) {

    private val log = Logger.getInstance(KaitenApiClient::class.java)
    private val gson = Gson()

    companion object {
        private const val MAX_RETRIES    = 3
        private const val RETRY_DELAY_MS = 1_000L
    }

    /**
     * Executes a GET request and deserialises the response body to [T].
     *
     * The single `@Suppress` here is the only place an unsafe cast is needed —
     * it is safe because [type] is always constructed from a concrete [TypeToken<T>]
     * at the call sites below.  Call sites are therefore fully type-safe and carry
     * no suppressions of their own.
     */
    @Suppress("UNCHECKED_CAST")
    private suspend fun <T> executeRequest(url: String, type: Type, retryCount: Int = 0): T =
        withContext(Dispatchers.IO) {
            val request  = Request.Builder().url(url).get().build()
            val start    = System.currentTimeMillis()
            log.info("[Kaiten API] --> GET $url")

            try {
                val response = client.newCall(request).execute()
                val duration = System.currentTimeMillis() - start

                when (val code = response.code) {
                    200 -> {
                        log.info("[Kaiten API] <-- GET $url $code OK (${duration}ms)")
                        val body = response.body.string()
                        gson.fromJson<T>(body, type)
                    }
                    401 -> {
                        log.warn("[Kaiten API] <-- GET $url $code Unauthorized (${duration}ms)")
                        throw KaitenApiException.Unauthorized()
                    }
                    403 -> {
                        log.warn("[Kaiten API] <-- GET $url $code Forbidden (${duration}ms)")
                        throw KaitenApiException.Forbidden()
                    }
                    404 -> {
                        log.warn("[Kaiten API] <-- GET $url $code Not Found (${duration}ms)")
                        throw KaitenApiException.NotFound()
                    }
                    in 500..599 -> {
                        log.warn("[Kaiten API] <-- GET $url $code Server Error (${duration}ms), retry=$retryCount")
                        retryOrThrow(url, type, retryCount, KaitenApiException.ServerError("Server error: $code"))
                    }
                    else -> {
                        log.warn("[Kaiten API] <-- GET $url $code Unexpected (${duration}ms)")
                        throw KaitenApiException.ServerError("Unexpected error: $code")
                    }
                }
            } catch (_: SocketTimeoutException) {
                val duration = System.currentTimeMillis() - start
                log.warn("[Kaiten API] <-- GET $url TIMEOUT (${duration}ms), retry=$retryCount")
                retryOrThrow(url, type, retryCount, KaitenApiException.TimeoutError())
            } catch (e: IOException) {
                val duration = System.currentTimeMillis() - start
                log.warn("[Kaiten API] <-- GET $url NETWORK_ERROR (${duration}ms): ${e.message}")
                throw KaitenApiException.NetworkError(e.message ?: "Network error")
            } catch (e: KaitenApiException) {
                throw e
            } catch (e: Exception) {
                val duration = System.currentTimeMillis() - start
                log.error("[Kaiten API] <-- GET $url ERROR (${duration}ms): ${e.message}", e)
                throw KaitenApiException.ServerError(e.message ?: "Unknown error")
            }
        }

    private suspend fun <T> retryOrThrow(
        url: String, type: Type, retryCount: Int, cause: KaitenApiException
    ): T {
        if (retryCount < MAX_RETRIES) {
            delay(RETRY_DELAY_MS * (retryCount + 1))
            return executeRequest(url, type, retryCount + 1)
        }
        throw cause
    }

    // ── Public API ────────────────────────────────────────────────────────────

    suspend fun getCurrentUser(): User {
        val dto = executeRequest<UserDto>("$baseUrl/users/current", object : TypeToken<UserDto>() {}.type)
        return dto.toDomain()
    }
}
