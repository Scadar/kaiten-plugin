package com.github.scadar.kaitenplugin.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil

@State(
    name = "KaitenPluginSettings",
    storages = [Storage("KaitenPluginSettings.xml")]
)
@Service
class KaitenSettingsState : PersistentStateComponent<KaitenSettingsState> {
    var serverUrl: String = "https://kaiten.comagic.dev/api/latest"
    var apiToken: String = ""
    var currentUserId: Long? = null

    // Single-select: space → board cascade
    var selectedSpaceId: Long? = null
    var selectedBoardId: Long? = null

    // Multi-select: columns within the selected board
    var selectedColumnIds: MutableSet<Long> = mutableSetOf()

    var filterByAssignee: Boolean = true
    var filterByParticipant: Boolean = false
    var filterLogic: String = "AND" // AND or OR
    var viewMode: String = "LIST"   // LIST, CARDS, or STATISTICS
    var skipSslVerification: Boolean = true

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
