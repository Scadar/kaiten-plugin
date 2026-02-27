package com.github.scadar.kaitenplugin.infrastructure

import com.github.scadar.kaitenplugin.domain.BranchTimeEntry
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project
import com.intellij.util.xmlb.XmlSerializerUtil
import java.time.LocalDate

data class BranchTimeEntryData(
    var branchName: String = "",
    var date: String = "",
    var durationSeconds: Long = 0
) {
    fun toDomain() = BranchTimeEntry(
        branchName = branchName,
        date = LocalDate.parse(date),
        durationSeconds = durationSeconds
    )

    companion object {
        fun fromDomain(entry: BranchTimeEntry) = BranchTimeEntryData(
            branchName = entry.branchName,
            date = entry.date.toString(),
            durationSeconds = entry.durationSeconds
        )
    }
}

@State(
    name = "KaitenBranchTimeEntries",
    storages = [Storage("KaitenBranchTimeEntries.xml")]
)
@Service(Service.Level.PROJECT)
class BranchTimeEntriesState : PersistentStateComponent<BranchTimeEntriesState> {
    var entries: MutableList<BranchTimeEntryData> = mutableListOf()

    override fun getState(): BranchTimeEntriesState = this

    override fun loadState(state: BranchTimeEntriesState) {
        XmlSerializerUtil.copyBean(state, this)
    }

    // FIX: All methods that touch `entries` are @Synchronized because:
    // - addEntry() is called from the checkpoint timer (Dispatchers.Default) and dispose().
    // - getAllEntries() / clearBranch() are called from RPC handlers (Dispatchers.Default).
    // - loadState() is called by the IntelliJ persistence framework on a background thread.
    // Plain ArrayList is not thread-safe; @Synchronized on `this` prevents CME.

    @Synchronized
    fun addEntry(entry: BranchTimeEntry) {
        val existing = entries.find { it.branchName == entry.branchName && it.date == entry.date.toString() }
        if (existing != null) {
            existing.durationSeconds += entry.durationSeconds
        } else {
            entries.add(BranchTimeEntryData.fromDomain(entry))
        }
    }

    @Synchronized
    fun getEntriesByBranch(branchName: String): List<BranchTimeEntry> {
        return entries.filter { it.branchName == branchName }.map { it.toDomain() }
    }

    @Synchronized
    fun getAllEntries(): Map<String, List<BranchTimeEntry>> {
        return entries.map { it.toDomain() }.groupBy { it.branchName }
    }

    @Synchronized
    fun clearBranch(branchName: String) {
        entries.removeAll { it.branchName == branchName }
    }

    companion object {
        fun getInstance(project: Project): BranchTimeEntriesState =
            project.getService(BranchTimeEntriesState::class.java)
    }
}
