package com.github.scadar.kaitenplugin.application

import com.github.scadar.kaitenplugin.domain.Task
import com.github.scadar.kaitenplugin.domain.User
import com.github.scadar.kaitenplugin.settings.KaitenSettingsState
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service

@Service
class FilterService {

    fun filterTasks(
        tasks: List<Task>,
        currentUser: User?,
        selectedSpaceIds: Set<Long> = emptySet(),
        selectedBoardIds: Set<Long> = emptySet(),
        selectedColumnIds: Set<Long> = emptySet(),
        filterByAssignee: Boolean = true,
        filterByParticipant: Boolean = false,
        filterLogic: String = "AND"
    ): List<Task> {
        var filteredTasks = tasks

        // Filter by column
        if (selectedColumnIds.isNotEmpty()) {
            filteredTasks = filteredTasks.filter { it.columnId in selectedColumnIds }
        }

        // Filter by user
        if (currentUser != null) {
            filteredTasks = when (filterLogic) {
                "AND" -> filterTasksByUserAnd(filteredTasks, currentUser, filterByAssignee, filterByParticipant)
                "OR" -> filterTasksByUserOr(filteredTasks, currentUser, filterByAssignee, filterByParticipant)
                else -> filteredTasks
            }
        }

        return filteredTasks
    }

    private fun filterTasksByUserAnd(
        tasks: List<Task>,
        user: User,
        filterByAssignee: Boolean,
        filterByParticipant: Boolean
    ): List<Task> {
        return tasks.filter { task ->
            val isAssignee = filterByAssignee && task.assigneeId == user.id
            val isParticipant = filterByParticipant && user.id in task.participants

            when {
                filterByAssignee && filterByParticipant -> isAssignee && isParticipant
                filterByAssignee -> isAssignee
                filterByParticipant -> isParticipant
                else -> true
            }
        }
    }

    private fun filterTasksByUserOr(
        tasks: List<Task>,
        user: User,
        filterByAssignee: Boolean,
        filterByParticipant: Boolean
    ): List<Task> {
        return tasks.filter { task ->
            val isAssignee = filterByAssignee && task.assigneeId == user.id
            val isParticipant = filterByParticipant && user.id in task.participants

            when {
                filterByAssignee && filterByParticipant -> isAssignee || isParticipant
                filterByAssignee -> isAssignee
                filterByParticipant -> isParticipant
                else -> true
            }
        }
    }

    fun applySettings(settings: KaitenSettingsState): FilterSettings {
        return FilterSettings(
            selectedSpaceIds = settings.selectedSpaceIds,
            selectedBoardIds = settings.selectedBoardIds,
            selectedColumnIds = settings.selectedColumnIds,
            filterByAssignee = settings.filterByAssignee,
            filterByParticipant = settings.filterByParticipant,
            filterLogic = settings.filterLogic
        )
    }

    companion object {
        fun getInstance(): FilterService = service()
    }
}

data class FilterSettings(
    val selectedSpaceIds: Set<Long>,
    val selectedBoardIds: Set<Long>,
    val selectedColumnIds: Set<Long>,
    val filterByAssignee: Boolean,
    val filterByParticipant: Boolean,
    val filterLogic: String
)
