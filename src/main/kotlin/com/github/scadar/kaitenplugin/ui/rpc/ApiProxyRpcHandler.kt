package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.google.gson.Gson
import com.intellij.openapi.diagnostic.logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.IOException
import java.net.SocketTimeoutException

class ApiProxyRpcHandler : RpcHandlerGroup {

    private val log = logger<ApiProxyRpcHandler>()

    // Cached HTTP client — recreated only when token changes.
    @Volatile
    private var cachedHttpClient: Pair<String, okhttp3.OkHttpClient>? = null

    private fun getOrCreateHttpClient(settings: KaitenSettingsState): okhttp3.OkHttpClient {
        val key = settings.apiToken
        cachedHttpClient?.takeIf { it.first == key }?.let { return it.second }
        val client = HttpClientProvider(settings.apiToken).createClient()
        cachedHttpClient = key to client
        return client
    }

    override fun register(bridge: JCEFBridgeHandler) {
        val gson = Gson()
        bridge.registerRPC(RPCMethodNames.API_REQUEST) { params ->
            @Suppress("UNCHECKED_CAST")
            val p = params as? Map<String, Any?>
                ?: return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Invalid params")
            val url = p["url"] as? String
                ?: return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Missing url")

            // Validate URL scheme and origin — only allow requests to the configured server.
            val parsedUri = runCatching { java.net.URI(url) }.getOrNull()
            if (parsedUri == null || parsedUri.scheme !in listOf("http", "https")) {
                return@registerRPC mapOf("ok" to false, "status" to 0, "message" to "Invalid URL scheme")
            }
            val requestOrigin = "${parsedUri.scheme}://${parsedUri.host}" +
                if (parsedUri.port > 0) ":${parsedUri.port}" else ""
            val settings = KaitenSettingsState.getInstance()
            val configuredOrigin = runCatching {
                java.net.URI(settings.serverUrl).run {
                    "$scheme://$host${if (port > 0) ":$port" else ""}"
                }
            }.getOrNull() ?: ""
            if (requestOrigin != configuredOrigin) {
                log.warn("API_REQUEST blocked: $requestOrigin not in allowed origins ($configuredOrigin)")
                return@registerRPC mapOf("ok" to false, "status" to 403, "message" to "URL not allowed")
            }

            val http    = getOrCreateHttpClient(settings)
            val request = Request.Builder().url(url).get().build()
            try {
                val response = withContext(Dispatchers.IO) { http.newCall(request).execute() }
                val status   = response.code
                val body     = response.body.string()
                if (status == 200) {
                    mapOf("ok" to true,  "status" to status, "body" to gson.fromJson(body, Any::class.java))
                } else {
                    mapOf("ok" to false, "status" to status, "message" to response.message.ifEmpty { "HTTP Error $status" })
                }
            } catch (_: SocketTimeoutException) {
                mapOf("ok" to false, "status" to 0, "message" to "Timeout")
            } catch (_: IOException) {
                mapOf("ok" to false, "status" to 0, "message" to "Network error")
            }
        }
    }
}
