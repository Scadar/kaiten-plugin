package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler

/**
 * A group of related RPC handlers that can be registered on a [JCEFBridgeHandler].
 */
interface RpcHandlerGroup {
    fun register(bridge: JCEFBridgeHandler)
}
