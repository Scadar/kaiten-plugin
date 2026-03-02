package com.github.scadar.kaitenplugin.ui.rpc

import com.github.scadar.kaitenplugin.bridge.JCEFBridgeHandler
import com.github.scadar.kaitenplugin.bridge.RPCMethodNames
import com.github.scadar.kaitenplugin.infrastructure.BranchTimeEntriesState
import com.github.scadar.kaitenplugin.timetracker.BranchTimeTrackingService
import com.intellij.openapi.project.Project

class BranchTimeRpcHandlers(private val project: Project) : RpcHandlerGroup {

    override fun register(bridge: JCEFBridgeHandler) {
        /**
         * Returns all persisted branch time entries plus live state for the active branch.
         * Shape: `Record<branchName, { total, daily, isActive, lastActive }>`
         */
        bridge.registerRPC(RPCMethodNames.GET_BRANCH_TIME_ENTRIES) { _ ->
            val state         = BranchTimeEntriesState.getInstance(project)
            val branchService = BranchTimeTrackingService.getInstance(project)
            val activeBranch  = branchService.getCurrentBranch()
            val liveSeconds   = branchService.getUnpersistedSeconds()
            val today         = java.time.LocalDate.now().toString()

            val allEntries = state.getAllEntries().toMutableMap()
            if (activeBranch != null && !allEntries.containsKey(activeBranch)) {
                allEntries[activeBranch] = emptyList()
            }

            allEntries.map { (branch, entries) ->
                val savedTotal = entries.sumOf { it.durationSeconds }
                val isActive   = branch == activeBranch
                val liveAdd    = if (isActive) liveSeconds else 0L

                // Group entries by date, and add live (un-persisted) seconds to today for the active branch
                val dailyMap   = entries
                    .groupBy { it.date.toString() }
                    .mapValues { (_, dayEntries) -> dayEntries.sumOf { it.durationSeconds } }
                    .toMutableMap()
                if (isActive && liveAdd > 0) {
                    dailyMap[today] = (dailyMap[today] ?: 0L) + liveAdd
                }
                val daily = dailyMap
                    .map { (date, seconds) -> mapOf("date" to date, "seconds" to seconds) }
                    .sortedByDescending { it["date"] as String }

                val lastActive = if (isActive) today
                    else entries.maxByOrNull { it.date }?.date?.toString()

                branch to mapOf(
                    "total"      to (savedTotal + liveAdd),
                    "daily"      to daily,
                    "isActive"   to (isActive && branchService.isCurrentlyTracking()),
                    "lastActive" to lastActive
                )
            }.toMap()
        }

        bridge.registerRPC(RPCMethodNames.GET_CURRENT_BRANCH) { _ ->
            val branchService = BranchTimeTrackingService.getInstance(project)
            mapOf(
                "branch"             to branchService.getCurrentBranch(),
                "isTracking"         to branchService.isCurrentlyTracking(),
                "accumulatedSeconds" to branchService.getAccumulatedSeconds()
            )
        }

        bridge.registerRPC(RPCMethodNames.CLEAR_BRANCH_ENTRIES) { params ->
            val branchName = params as? String ?: return@registerRPC false
            BranchTimeEntriesState.getInstance(project).clearBranch(branchName)
            true
        }
    }
}
