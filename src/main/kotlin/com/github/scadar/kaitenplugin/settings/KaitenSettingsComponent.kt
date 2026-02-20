package com.github.scadar.kaitenplugin.settings

import com.github.scadar.kaitenplugin.api.KaitenApiClient
import com.github.scadar.kaitenplugin.infrastructure.HttpClientProvider
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPasswordField
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.swing.JButton
import javax.swing.JCheckBox
import javax.swing.JComponent
import javax.swing.JPanel

class KaitenSettingsComponent {
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    val serverUrlField = JBTextField()
    val apiTokenField = JBPasswordField()
    val skipSslVerificationCheckBox = JCheckBox("Skip SSL certificate verification (for self-signed certificates)")
    private val testConnectionButton = JButton("Test Connection")
    private val connectionStatusLabel = JBLabel("")

    val panel: JPanel = FormBuilder.createFormBuilder()
        .addLabeledComponent(JBLabel("Server URL:"), serverUrlField, 1, false)
        .addLabeledComponent(JBLabel("API Token:"), apiTokenField, 1, false)
        .addComponent(skipSslVerificationCheckBox)
        .addComponent(testConnectionButton)
        .addComponent(connectionStatusLabel)
        .addComponentFillVertically(JPanel(), 0)
        .panel

    init {
        testConnectionButton.addActionListener {
            testConnection()
        }
    }

    private fun testConnection() {
        val url = serverUrlField.text.trim()
        val token = String(apiTokenField.password)

        if (url.isEmpty() || token.isEmpty()) {
            connectionStatusLabel.text = "❌ Please enter both Server URL and API Token"
            return
        }

        connectionStatusLabel.text = "⏳ Testing connection..."
        testConnectionButton.isEnabled = false

        scope.launch(Dispatchers.IO) {
            try {
                val httpClient = HttpClientProvider(token, skipSslVerificationCheckBox.isSelected).createClient()
                val apiClient = KaitenApiClient(httpClient, url)

                // Try to fetch current user
                val user = apiClient.getCurrentUser()

                scope.launch(Dispatchers.Main) {
                    connectionStatusLabel.text = "✅ Connection successful! Logged in as: ${user.name}"
                    testConnectionButton.isEnabled = true
                }
            } catch (e: Exception) {
                scope.launch(Dispatchers.Main) {
                    connectionStatusLabel.text = "❌ Connection failed: ${e.message}"
                    testConnectionButton.isEnabled = true
                }
            }
        }
    }

    fun getPreferredFocusedComponent(): JComponent = serverUrlField

    var serverUrl: String
        get() = serverUrlField.text
        set(value) {
            serverUrlField.text = value
        }

    var apiToken: String
        get() = String(apiTokenField.password)
        set(value) {
            apiTokenField.text = value
        }

    var skipSslVerification: Boolean
        get() = skipSslVerificationCheckBox.isSelected
        set(value) {
            skipSslVerificationCheckBox.isSelected = value
        }
}
