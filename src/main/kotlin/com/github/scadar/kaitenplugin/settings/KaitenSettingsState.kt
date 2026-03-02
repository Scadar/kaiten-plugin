package com.github.scadar.kaitenplugin.settings

import com.intellij.credentialStore.CredentialAttributes
import com.intellij.credentialStore.Credentials
import com.intellij.ide.passwordSafe.PasswordSafe
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil
import com.intellij.util.xmlb.annotations.XCollection

@State(
    name = "KaitenPluginSettings",
    storages = [Storage("KaitenPluginSettings.xml")]
)
@Service(Service.Level.APP)
class KaitenSettingsState : PersistentStateComponent<KaitenSettingsState> {
    var serverUrl: String = ""
    var currentUserId: Long? = null

    // Persisted result of the last connection verification.
    // Empty = no error (either never verified or last check passed).
    // Non-empty = human-readable error from the last failed attempt.
    var lastConnectionError: String = ""

    // apiToken is NOT stored in XML — kept in the OS keychain via PasswordSafe
    val apiToken: String
        get() {
            val attrs = CredentialAttributes("KaitenPlugin", "apiToken")
            return PasswordSafe.instance.getPassword(attrs) ?: ""
        }

    fun setApiToken(token: String) {
        val attrs = CredentialAttributes("KaitenPlugin", "apiToken")
        PasswordSafe.instance.set(attrs, if (token.isBlank()) null else Credentials("apiToken", token))
    }

    // Single-select: space → board cascade
    var selectedSpaceId: Long? = null
    var selectedBoardId: Long? = null

    // Multi-select: columns within the selected board
    var selectedColumnIds: MutableSet<Long> = mutableSetOf()

    var filterByAssignee: Boolean = true
    var filterByParticipant: Boolean = false
    var filterLogic: String = "AND" // AND or OR
    var viewMode: String = "LIST"   // LIST, CARDS, or STATISTICS

    // Filter panel state (persisted between sessions)
    var selectedFilterUserId: Long? = null
    var filterAsMember: Boolean = true
    var filterAsResponsible: Boolean = true

    // Branch patterns used to identify task branches.
    // Use {id} as placeholder for the task identifier, e.g. "task/ktn-{id}"
    @XCollection(style = XCollection.Style.v2)
    var branchPatterns: MutableList<String> = mutableListOf("task/ktn-{id}")

    // Commit message template — used by the "Insert Kaiten Task Reference" commit toolbar button.
    // Use {id} for the task ID and {title} for the card title, e.g. "ktn-{id}: {title}"
    var commitMessageTemplate: String = "ktn-{id}: {title}"

    // Release page settings
    var releaseSpaceId: Long? = null
    var releaseBoardId: Long? = null
    var releaseColumnIds: MutableSet<Long> = mutableSetOf()
    var activeReleaseCardId: Long? = null

    override fun getState(): KaitenSettingsState = this

    override fun loadState(state: KaitenSettingsState) {
        XmlSerializerUtil.copyBean(state, this)
    }

    companion object {
        fun getInstance(): KaitenSettingsState =
            com.intellij.openapi.application.ApplicationManager.getApplication()
                .getService(KaitenSettingsState::class.java)
    }
}
