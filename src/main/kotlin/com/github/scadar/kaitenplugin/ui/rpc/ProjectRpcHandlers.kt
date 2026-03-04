package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.intellij.ide.BrowserUtil
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ProjectRpcHandlers(private val project: Project) : RpcHandlerGroup {

    private val log = logger<ProjectRpcHandlers>()

    override fun register(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_PROJECT_PATH) { _ ->
            project.basePath
        }

        // FIX: FileEditorManager.getSelectedFiles() accesses EDT-only internal state.
        // RPC handlers run on Dispatchers.Default, so we switch to Main for this one call.
        bridge.registerRPC(RPCMethodNames.GET_SELECTED_FILE) { _ ->
            withContext(Dispatchers.Main) {
                FileEditorManager.getInstance(project).selectedFiles.firstOrNull()?.path
            }
        }

        bridge.registerRPC(RPCMethodNames.GET_PROJECT_NAME) { _ ->
            project.name
        }

        bridge.registerRPC(RPCMethodNames.OPEN_FILE) { params ->
            val filePath = params as? String ?: return@registerRPC false
            log.info("Open file requested: $filePath")
            true
        }

        bridge.registerRPC(RPCMethodNames.OPEN_URL) { params ->
            @Suppress("UNCHECKED_CAST")
            val url = (params as? Map<String, Any?>)?.get("url") as? String
                ?: params as? String
                ?: return@registerRPC false

            val scheme = runCatching { java.net.URI(url).scheme?.lowercase() }.getOrNull()
            if (scheme !in listOf("http", "https")) {
                log.warn("OPEN_URL blocked: unsupported scheme '$scheme' in '$url'")
                return@registerRPC false
            }

            log.info("Open URL requested: $url")
            withContext(Dispatchers.Main) {
                BrowserUtil.browse(url)
            }
            true
        }

        bridge.registerRPC(RPCMethodNames.SHOW_NOTIFICATION) { params ->
            @Suppress("UNCHECKED_CAST")
            val notification = params as? Map<String, Any?> ?: return@registerRPC false
            val message = notification["message"] as? String ?: "No message"
            val type    = notification["type"]    as? String ?: "info"
            log.info("Notification requested ($type): $message")
            true
        }
    }
}
