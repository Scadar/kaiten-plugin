package com.github.scadar.kaitenplugin.application

import com.github.scadar.kaitenplugin.api.KaitenApiClient
import com.github.scadar.kaitenplugin.domain.*
import com.github.scadar.kaitenplugin.infrastructure.CacheManager
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@Service
class TaskService {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val log = logger<TaskService>()

    private val spacesCache = CacheManager<String, List<Space>>()
    private val boardsCache = CacheManager<Long, List<Board>>()
    private val columnsCache = CacheManager<Long, List<Column>>()
    private val tasksCache = CacheManager<Long, List<Task>>()
    private val usersCache = CacheManager<String, List<User>>()

    private fun getApiClient(): KaitenApiClient? {
        val settings = KaitenSettingsState.getInstance()
        if (settings.apiToken.isEmpty()) {
            log.warn("API token is not configured")
            return null
        }
        val httpClient = HttpClientProvider(settings.apiToken).createClient()
        return KaitenApiClient(httpClient, settings.serverUrl)
    }

    suspend fun getSpaces(forceRefresh: Boolean = false): List<Space> {
        val cacheKey = "all_spaces"
        if (!forceRefresh && spacesCache.containsKey(cacheKey)) {
            return spacesCache.get(cacheKey) ?: emptyList()
        }

        val client = getApiClient() ?: return emptyList()
        return try {
            val spaces = client.getSpaces()
            spacesCache.put(cacheKey, spaces)
            spaces
        } catch (e: Exception) {
            log.error("Failed to fetch spaces", e)
            emptyList()
        }
    }

    suspend fun getBoards(spaceId: Long, forceRefresh: Boolean = false): List<Board> {
        if (!forceRefresh && boardsCache.containsKey(spaceId)) {
            return boardsCache.get(spaceId) ?: emptyList()
        }

        val client = getApiClient() ?: return emptyList()
        return try {
            val boards = client.getBoards(spaceId)
            boardsCache.put(spaceId, boards)
            boards
        } catch (e: Exception) {
            log.error("Failed to fetch boards for space $spaceId", e)
            emptyList()
        }
    }

    suspend fun getColumns(boardId: Long, forceRefresh: Boolean = false): List<Column> {
        if (!forceRefresh && columnsCache.containsKey(boardId)) {
            return columnsCache.get(boardId) ?: emptyList()
        }

        val client = getApiClient() ?: return emptyList()
        return try {
            val columns = client.getColumns(boardId)
            columnsCache.put(boardId, columns)
            columns
        } catch (e: Exception) {
            log.error("Failed to fetch columns for board $boardId", e)
            emptyList()
        }
    }

    suspend fun getTasks(boardId: Long, forceRefresh: Boolean = false): List<Task> {
        if (!forceRefresh && tasksCache.containsKey(boardId)) {
            return tasksCache.get(boardId) ?: emptyList()
        }

        val client = getApiClient() ?: return emptyList()
        return try {
            val tasks = client.getCards(boardId)
            tasksCache.put(boardId, tasks)
            tasks
        } catch (e: Exception) {
            log.error("Failed to fetch tasks for board $boardId", e)
            emptyList()
        }
    }

    suspend fun getUsers(forceRefresh: Boolean = false): List<User> {
        val cacheKey = "all_users"
        if (!forceRefresh && usersCache.containsKey(cacheKey)) {
            return usersCache.get(cacheKey) ?: emptyList()
        }

        val client = getApiClient() ?: return emptyList()
        return try {
            val users = client.getUsers()
            usersCache.put(cacheKey, users)
            users
        } catch (e: Exception) {
            log.error("Failed to fetch users", e)
            emptyList()
        }
    }

    fun invalidateCache() {
        spacesCache.invalidateAll()
        boardsCache.invalidateAll()
        columnsCache.invalidateAll()
        tasksCache.invalidateAll()
        usersCache.invalidateAll()
    }

    companion object {
        fun getInstance(): TaskService = service()
    }
}
