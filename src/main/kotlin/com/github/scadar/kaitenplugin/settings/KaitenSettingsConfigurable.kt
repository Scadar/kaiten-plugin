package com.github.scadar.kaitenplugin.settings

import com.intellij.openapi.options.Configurable
import javax.swing.JComponent

class KaitenSettingsConfigurable : Configurable {
    private var settingsComponent: KaitenSettingsComponent? = null

    override fun getDisplayName(): String = "Kaiten"

    override fun getPreferredFocusedComponent(): JComponent? =
        settingsComponent?.getPreferredFocusedComponent()

    override fun createComponent(): JComponent? {
        settingsComponent = KaitenSettingsComponent()
        return settingsComponent?.panel
    }

    override fun isModified(): Boolean {
        val settings = KaitenSettingsState.getInstance()
        val component = settingsComponent ?: return false

        return component.serverUrl != settings.serverUrl ||
                component.apiToken != settings.apiToken
    }

    override fun apply() {
        val settings = KaitenSettingsState.getInstance()
        val component = settingsComponent ?: return

        settings.serverUrl = component.serverUrl
        settings.setApiToken(component.apiToken)
    }

    override fun reset() {
        val settings = KaitenSettingsState.getInstance()
        val component = settingsComponent ?: return

        component.serverUrl = settings.serverUrl
        component.apiToken = settings.apiToken
    }

    override fun disposeUIResources() {
        // FIX: Cancel the component's coroutine scope before releasing the reference
        // so any in-flight "Test Connection" network calls are properly cancelled.
        settingsComponent?.dispose()
        settingsComponent = null
    }
}
