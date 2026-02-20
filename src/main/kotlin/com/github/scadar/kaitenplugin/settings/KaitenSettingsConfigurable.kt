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
                component.apiToken != settings.apiToken ||
                component.skipSslVerification != settings.skipSslVerification
    }

    override fun apply() {
        val settings = KaitenSettingsState.getInstance()
        val component = settingsComponent ?: return

        settings.serverUrl = component.serverUrl
        settings.apiToken = component.apiToken
        settings.skipSslVerification = component.skipSslVerification
    }

    override fun reset() {
        val settings = KaitenSettingsState.getInstance()
        val component = settingsComponent ?: return

        component.serverUrl = settings.serverUrl
        component.apiToken = settings.apiToken
        component.skipSslVerification = settings.skipSslVerification
    }

    override fun disposeUIResources() {
        settingsComponent = null
    }
}
