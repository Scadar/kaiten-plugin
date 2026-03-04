package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.github.scadar.kaitenplugin.settings.KaitenSettingsConfigurable
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.github.scadar.kaitenplugin.settings.SettingsMapper
import com.intellij.openapi.project.Project
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SettingsRpcHandlers(private val project: Project) : RpcHandlerGroup {

    override fun register(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_SETTINGS) { _ ->
            SettingsMapper.toMap(KaitenSettingsState.getInstance())
        }

        bridge.registerRPC(RPCMethodNames.UPDATE_SETTINGS) { params ->
            @Suppress("UNCHECKED_CAST")
            val outerParams = params as? Map<String, Any?> ?: return@registerRPC false
            @Suppress("UNCHECKED_CAST")
            val updates = outerParams["settings"] as? Map<String, Any?> ?: return@registerRPC false
            SettingsMapper.applyMap(updates, KaitenSettingsState.getInstance())
            true
        }

        bridge.registerRPC(RPCMethodNames.OPEN_SETTINGS) { _ ->
            withContext(Dispatchers.Main) {
                com.intellij.openapi.options.ShowSettingsUtil.getInstance()
                    .showSettingsDialog(project, KaitenSettingsConfigurable::class.java.name)
            }
            true
        }
    }
}
