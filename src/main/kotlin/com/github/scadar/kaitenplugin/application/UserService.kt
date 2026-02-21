package com.github.scadar.kaitenplugin.application

import com.github.scadar.kaitenplugin.domain.User
import com.github.scadar.kaitenplugin.infrastructure.CacheManager
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.api.KaitenApiClient
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.diagnostic.logger

@Deprecated("Business logic migrated to React frontend. Use REST API endpoints instead.")
@Service
class UserService {
    private val log = logger<UserService>()
    private val currentUserCache = CacheManager<String, User>()

    private fun getApiClient(): KaitenApiClient? {
        val settings = KaitenSettingsState.getInstance()
        if (settings.apiToken.isEmpty()) {
            log.warn("API token is not configured")
            return null
        }
        val httpClient = HttpClientProvider(settings.apiToken, settings.skipSslVerification).createClient()
        return KaitenApiClient(httpClient, settings.serverUrl)
    }

    suspend fun getCurrentUser(forceRefresh: Boolean = false): User? {
        val cacheKey = "current_user"

        if (!forceRefresh && currentUserCache.containsKey(cacheKey)) {
            return currentUserCache.get(cacheKey)
        }

        val client = getApiClient() ?: return null

        return try {
            val user = client.getCurrentUser()
            currentUserCache.put(cacheKey, user)

            // Save current user ID to settings
            val settings = KaitenSettingsState.getInstance()
            settings.currentUserId = user.id

            log.info("Current user loaded: ${user.name} (ID: ${user.id})")
            user
        } catch (e: Exception) {
            log.error("Failed to fetch current user", e)

            // Try to use cached user ID from settings
            val settings = KaitenSettingsState.getInstance()
            settings.currentUserId?.let { userId ->
                try {
                    val allUsers = getApiClient()?.getUsers() ?: emptyList()
                    allUsers.find { it.id == userId }
                } catch (ex: Exception) {
                    log.error("Failed to fetch user by ID", ex)
                    null
                }
            }
        }
    }

    suspend fun getAllUsers(forceRefresh: Boolean = false): List<User> {
        val client = getApiClient() ?: return emptyList()

        return try {
            client.getUsers()
        } catch (e: Exception) {
            log.error("Failed to fetch all users", e)
            emptyList()
        }
    }

    fun invalidateCache() {
        currentUserCache.invalidateAll()
    }

    companion object {
        fun getInstance(): UserService = service()
    }
}
