package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.intellij.ui.JBColor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.swing.UIManager

class ThemeRpcHandlers : RpcHandlerGroup {

    override fun register(bridge: JCEFBridgeHandler) {
        bridge.registerRPC(RPCMethodNames.GET_IDE_THEME) { _ ->
            withContext(Dispatchers.Main) { buildIdeThemeMap() }
        }
    }

    /** Public helper so [com.github.scadar.kaitenplugin.ui.KaitenToolWindowFactory] can build the map on theme changes. */
    fun buildIdeThemeMap(): Map<String, Any> {
        val isDark = !JBColor.isBright()

        fun hex(vararg keys: String): String? {
            for (key in keys) {
                val c = UIManager.getColor(key) ?: continue
                return String.format("#%02x%02x%02x", c.red, c.green, c.blue)
            }
            return null
        }

        fun int(vararg keys: String): Int? {
            for (key in keys) {
                val v = UIManager.get(key) ?: continue
                if (v is Number) return v.toInt()
            }
            return null
        }

        val bgFallback   = if (isDark) "#2b2d30" else "#f2f2f2"
        val fgFallback   = if (isDark) "#dfe1e5" else "#1a1a1a"
        val cardFallback = if (isDark) "#1e1f22" else "#ffffff"

        val labelFont = UIManager.getFont("Label.font")
        val fontName = labelFont?.family
            ?.takeIf { it.isNotBlank() && it != "Dialog" && it != "DialogInput" }
        val fontSize = labelFont?.size ?: 13

        val arc = int("Component.arc", "Button.arc") ?: 6

        return mapOf(
            "isDark"                to isDark,
            "background"            to (hex("Panel.background", "window") ?: bgFallback),
            "foreground"            to (hex("Label.foreground", "windowText") ?: fgFallback),
            "card"                  to (hex("EditorPane.background", "Editor.background", "TextArea.background") ?: cardFallback),
            "cardForeground"        to (hex("Label.foreground", "windowText") ?: fgFallback),
            "popover"               to (hex("PopupMenu.background", "Popup.background", "Panel.background") ?: bgFallback),
            "popoverForeground"     to (hex("Label.foreground", "windowText") ?: fgFallback),
            "primary"               to (hex("Button.default.startBackground", "Link.activeForeground", "Hyperlink.linkColor", "Component.focusColor") ?: if (isDark) "#4e9cff" else "#2970d8"),
            "primaryForeground"     to "#ffffff",
            "secondary"             to (hex("Button.background") ?: if (isDark) "#3c3f41" else "#e8e8e8"),
            "secondaryForeground"   to (hex("Button.foreground", "Label.foreground") ?: fgFallback),
            "muted"                 to (hex("Button.background") ?: if (isDark) "#3c3f41" else "#e8e8e8"),
            "mutedForeground"       to (hex("Label.disabledForeground", "textInactiveText") ?: if (isDark) "#888d94" else "#6c7178"),
            "accent"                to (hex("List.selectionBackground", "Tree.selectionBackground") ?: if (isDark) "#2e436e" else "#dae4f7"),
            "accentForeground"      to (hex("List.selectionForeground", "Tree.selectionForeground") ?: fgFallback),
            "border"                to (hex("Component.borderColor", "Separator.foreground") ?: if (isDark) "#43454a" else "#d1d3da"),
            "input"                 to (hex("TextField.background") ?: if (isDark) "#3c3f41" else "#ffffff"),
            "inputForeground"       to (hex("TextField.foreground", "Label.foreground") ?: fgFallback),
            "ring"                  to (hex("Component.focusColor", "Focus.color", "Hyperlink.linkColor") ?: if (isDark) "#4e9cff" else "#2970d8"),
            "destructive"           to (hex("ToolTip.errorForeground", "Notification.errorForeground") ?: if (isDark) "#e05252" else "#e04343"),
            "destructiveForeground" to "#ffffff",
            "radius"                to "${arc}px",
            "fontSize"              to "${fontSize}px",
            "fontSizeSm"            to "${(fontSize - 1).coerceAtLeast(11)}px",
            "fontSizeXs"            to "${(fontSize - 2).coerceAtLeast(10)}px",
            "fontFamily"            to (fontName ?: ""),
        )
    }
}
