package com.github.scadar.kaitenplugin.settings

/**
 * Utility object for serialising [KaitenSettingsState] to/from a plain [Map].
 *
 * Having a single place for this mapping eliminates the duplication that existed
 * between the `getSettings`/`updateSettings` RPC handlers and [StateManager].
 */
object SettingsMapper {

    /** Converts all settings fields to a map that can be sent to the React frontend. */
    fun toMap(settings: KaitenSettingsState): Map<String, Any?> = mapOf(
        "serverUrl"            to settings.serverUrl,
        "hasToken"             to settings.apiToken.isNotBlank(),
        "selectedSpaceId"      to settings.selectedSpaceId,
        "selectedBoardId"      to settings.selectedBoardId,
        "selectedColumnIds"    to settings.selectedColumnIds.toList(),
        "filterByAssignee"     to settings.filterByAssignee,
        "filterByParticipant"  to settings.filterByParticipant,
        "filterLogic"          to settings.filterLogic,
        "viewMode"             to settings.viewMode,
        "selectedFilterUserId" to settings.selectedFilterUserId,
        "filterAsMember"       to settings.filterAsMember,
        "filterAsResponsible"  to settings.filterAsResponsible,
        "branchPatterns"       to settings.branchPatterns.toList(),
        "releaseSpaceId"       to settings.releaseSpaceId,
        "releaseBoardId"       to settings.releaseBoardId,
        "releaseColumnIds"     to settings.releaseColumnIds.toList(),
        "activeReleaseCardId"  to settings.activeReleaseCardId
    )

    /**
     * Applies a partial-or-full settings map (as received from React) back onto
     * [settings].  Keys that are absent in [updates] are left unchanged.
     */
    @Suppress("UNCHECKED_CAST")
    fun applyMap(updates: Map<String, Any?>, settings: KaitenSettingsState) {
        (updates["apiToken"]            as? String)?.let  { settings.setApiToken(it) }
        (updates["serverUrl"]           as? String)?.let  { settings.serverUrl           = it }
        (updates["selectedSpaceId"]     as? Number)?.let  { settings.selectedSpaceId     = it.toLong() }
        (updates["selectedBoardId"]     as? Number)?.let  { settings.selectedBoardId     = it.toLong() }
        (updates["filterByAssignee"]    as? Boolean)?.let { settings.filterByAssignee    = it }
        (updates["filterByParticipant"] as? Boolean)?.let { settings.filterByParticipant = it }
        (updates["filterLogic"]         as? String)?.let  { settings.filterLogic         = it }
        (updates["viewMode"]            as? String)?.let  { settings.viewMode            = it }
        (updates["filterAsMember"]      as? Boolean)?.let { settings.filterAsMember      = it }
        (updates["filterAsResponsible"] as? Boolean)?.let { settings.filterAsResponsible = it }
        (updates["branchPatterns"] as? List<*>)?.let { list ->
            settings.branchPatterns = list.mapNotNull { it as? String }.toMutableList()
        }

        // Nullable Long — explicit containsKey check so React can clear the value with null.
        if (updates.containsKey("selectedFilterUserId")) {
            settings.selectedFilterUserId = (updates["selectedFilterUserId"] as? Number)?.toLong()
        }

        (updates["selectedColumnIds"] as? List<*>)?.let { list ->
            settings.selectedColumnIds = list.mapNotNull { (it as? Number)?.toLong() }.toMutableSet()
        }

        (updates["releaseBoardId"] as? Number)?.let  { settings.releaseBoardId = it.toLong() }
        (updates["releaseColumnIds"] as? List<*>)?.let { list ->
            settings.releaseColumnIds = list.mapNotNull { (it as? Number)?.toLong() }.toMutableSet()
        }

        if (updates.containsKey("releaseSpaceId")) {
            settings.releaseSpaceId = (updates["releaseSpaceId"] as? Number)?.toLong()
        }
        if (updates.containsKey("activeReleaseCardId")) {
            settings.activeReleaseCardId = (updates["activeReleaseCardId"] as? Number)?.toLong()
        }
    }
}
