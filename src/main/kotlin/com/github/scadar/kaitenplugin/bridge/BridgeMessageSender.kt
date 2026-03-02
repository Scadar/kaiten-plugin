package com.github.scadar.kaitenplugin.bridge

import com.google.gson.Gson
import com.intellij.openapi.diagnostic.logger
import com.intellij.ui.jcef.JBCefBrowser

/**
 * Encapsulates the single point of message delivery from IDE to React via JCEF.
 *
 * Handles JSON serialisation and JavaScript injection-safe escaping so callers
 * only need to pass a typed message object.
 */
class BridgeMessageSender(private val browser: JBCefBrowser, private val gson: Gson) {

    private val log = logger<BridgeMessageSender>()

    /**
     * Serialises [message] to JSON and delivers it to the React app via
     * `window.__jcef_receive__`.
     *
     * Uses double [Gson.toJson] encoding to produce a properly escaped JS string
     * literal, which is injection-safe.
     */
    fun send(message: Any) {
        try {
            val messageJson = gson.toJson(message)

            // gson.toJson(string) produces a properly escaped JSON string literal including
            // surrounding double-quotes (e.g. "abc\"def\\n"). Passing this directly to JS
            // avoids any order-dependent manual escaping and is injection-safe.
            val jsStringLiteral = gson.toJson(messageJson)
            val script = "window.__jcef_receive__ && window.__jcef_receive__($jsStringLiteral);"

            browser.cefBrowser.executeJavaScript(script, browser.cefBrowser.url, 0)

            log.debug("Sent message to React: ${message.javaClass.simpleName}")
        } catch (e: Exception) {
            log.error("Error sending message to React", e)
        }
    }
}
