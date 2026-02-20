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
import java.net.SocketTimeoutException
import java.net.URLEncoder

class KaitenApiClient(private val client: OkHttpClient, private val baseUrl: String) {

    private val LOG = Logger.getInstance(KaitenApiClient::class.java)
    private val gson = Gson()
    private val maxRetries = 3
    private val retryDelayMs = 1000L

    private suspend fun executeRequest(
        url: String,
        typeToken: TypeToken<*>,
        retryCount: Int = 0
    ): Any = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .get()
            .build()

        val startTime = System.currentTimeMillis()
        LOG.info("[Kaiten API] --> GET $url")

        try {
            val response = client.newCall(request).execute()
            val duration = System.currentTimeMillis() - startTime

            when (response.code) {
                200 -> {
                    LOG.info("[Kaiten API] <-- GET $url ${response.code} OK (${duration}ms)")
                    val body = response.body?.string() ?: throw KaitenApiException.ServerError("Empty response body")
                    gson.fromJson(body, typeToken.type)
                }
                401 -> {
                    LOG.warn("[Kaiten API] <-- GET $url ${response.code} Unauthorized (${duration}ms)")
                    throw KaitenApiException.Unauthorized()
                }
                403 -> {
                    LOG.warn("[Kaiten API] <-- GET $url ${response.code} Forbidden (${duration}ms)")
                    throw KaitenApiException.Forbidden()
                }
                404 -> {
                    LOG.warn("[Kaiten API] <-- GET $url ${response.code} Not Found (${duration}ms)")
                    throw KaitenApiException.NotFound()
                }
                in 500..599 -> {
                    LOG.warn("[Kaiten API] <-- GET $url ${response.code} Server Error (${duration}ms), retry=$retryCount")
                    if (retryCount < maxRetries) {
                        delay(retryDelayMs * (retryCount + 1))
                        executeRequest(url, typeToken, retryCount + 1)
                    } else {
                        throw KaitenApiException.ServerError("Server error: ${response.code}")
                    }
                }
                else -> {
                    LOG.warn("[Kaiten API] <-- GET $url ${response.code} Unexpected (${duration}ms)")
                    throw KaitenApiException.ServerError("Unexpected error: ${response.code}")
                }
            }
        } catch (e: SocketTimeoutException) {
            val duration = System.currentTimeMillis() - startTime
            LOG.warn("[Kaiten API] <-- GET $url TIMEOUT (${duration}ms), retry=$retryCount")
            if (retryCount < maxRetries) {
                delay(retryDelayMs * (retryCount + 1))
                executeRequest(url, typeToken, retryCount + 1)
            } else {
                throw KaitenApiException.TimeoutError()
            }
        } catch (e: IOException) {
            val duration = System.currentTimeMillis() - startTime
            LOG.warn("[Kaiten API] <-- GET $url NETWORK_ERROR (${duration}ms): ${e.message}")
            throw KaitenApiException.NetworkError(e.message ?: "Network error")
        } catch (e: KaitenApiException) {
            throw e
        } catch (e: Exception) {
            val duration = System.currentTimeMillis() - startTime
            LOG.error("[Kaiten API] <-- GET $url ERROR (${duration}ms): ${e.message}", e)
            throw KaitenApiException.ServerError(e.message ?: "Unknown error")
        }
    }

    suspend fun getSpaces(): List<Space> {
        @Suppress("UNCHECKED_CAST")
        val dtos = executeRequest("$baseUrl/spaces", object : TypeToken<List<SpaceDto>>() {}) as List<SpaceDto>
        return dtos.map { it.toDomain() }
    }

    suspend fun getBoards(spaceId: Long): List<Board> {
        @Suppress("UNCHECKED_CAST")
        val dtos = executeRequest("$baseUrl/spaces/$spaceId/boards", object : TypeToken<List<BoardDto>>() {}) as List<BoardDto>
        return dtos.map { it.toDomain() }
    }

    suspend fun getColumns(boardId: Long): List<Column> {
        @Suppress("UNCHECKED_CAST")
        val dtos = executeRequest("$baseUrl/boards/$boardId/columns", object : TypeToken<List<ColumnDto>>() {}) as List<ColumnDto>
        return dtos.map { it.toDomain() }
    }

    suspend fun getCards(boardId: Long, searchText: String? = null): List<Task> {
        val url = if (!searchText.isNullOrBlank()) {
            val encoded = URLEncoder.encode(searchText, "UTF-8")
            LOG.info("[Kaiten API] getCards with search query: \"$searchText\"")
            "$baseUrl/boards/$boardId/cards?text=$encoded"
        } else {
            "$baseUrl/boards/$boardId/cards"
        }
        @Suppress("UNCHECKED_CAST")
        val dtos = executeRequest(url, object : TypeToken<List<TaskDto>>() {}) as List<TaskDto>
        return dtos.map { it.toDomain() }
    }

    suspend fun getCard(cardId: Long): Task {
        val dto = executeRequest("$baseUrl/cards/$cardId", object : TypeToken<TaskDto>() {}) as TaskDto
        return dto.toDomain()
    }

    suspend fun getUsers(): List<User> {
        @Suppress("UNCHECKED_CAST")
        val dtos = executeRequest("$baseUrl/users", object : TypeToken<List<UserDto>>() {}) as List<UserDto>
        return dtos.map { it.toDomain() }
    }

    suspend fun getCurrentUser(): User {
        val dto = executeRequest("$baseUrl/users/current", object : TypeToken<UserDto>() {}) as UserDto
        return dto.toDomain()
    }
}
