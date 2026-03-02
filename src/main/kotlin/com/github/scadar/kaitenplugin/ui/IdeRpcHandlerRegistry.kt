package com.github.scadar.kaitenplugin.ui

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.ui.rpc.*
import com.intellij.openapi.diagnostic.logger
import com.intellij.openapi.project.Project

/**
 * Registers all IDE-side RPC handlers on a [JCEFBridgeHandler].
 *
 * Each domain-specific group is implemented as a separate [RpcHandlerGroup],
 * keeping handler logic isolated and independently testable.
 */
class IdeRpcHandlerRegistry(private val project: Project) {

    private val log = logger<IdeRpcHandlerRegistry>()

    private val themeHandlers = ThemeRpcHandlers()

    private val groups: List<RpcHandlerGroup> = listOf(
        ProjectRpcHandlers(project),
        SettingsRpcHandlers(project),
        ApiProxyRpcHandler(),
        BranchTimeRpcHandlers(project),
        GitRpcHandlers(project),
        themeHandlers,
    )

    fun register(bridge: JCEFBridgeHandler) {
        groups.forEach { it.register(bridge) }
        log.debug("Registered all IDE RPC handlers")
    }

    /** Public helper so [KaitenToolWindowFactory] can build the map on theme changes. */
    fun buildIdeThemeMap(): Map<String, Any> = themeHandlers.buildIdeThemeMap()
}
