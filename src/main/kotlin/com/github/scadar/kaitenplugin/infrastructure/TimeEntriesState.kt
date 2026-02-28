package com.github.scadar.kaitenplugin.infrastructure

import com.github.scadar.kaitenplugin.domain.TaskTimeEntry
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project
import com.intellij.util.xmlb.XmlSerializerUtil

data class TimeEntryData(
    var taskId: Long = 0,
    var date: String = "",
    var durationSeconds: Long = 0
) {
    companion object {
        fun fromDomain(entry: TaskTimeEntry) = TimeEntryData(
            taskId = entry.taskId,
            date = entry.date.toString(),
            durationSeconds = entry.durationSeconds
        )
    }
}

@State(
    name = "KaitenTimeEntries",
    storages = [Storage("KaitenTimeEntries.xml")]
)
@Service(Service.Level.PROJECT)
class TimeEntriesState : PersistentStateComponent<TimeEntriesState> {
    var entries: MutableList<TimeEntryData> = mutableListOf()

    override fun getState(): TimeEntriesState = this

    override fun loadState(state: TimeEntriesState) {
        XmlSerializerUtil.copyBean(state, this)
    }

    // FIX: All methods that touch `entries` are @Synchronized because:
    // - addEntry() is called from the checkpoint timer (Dispatchers.Default) and dispose() (project close thread).
    // - loadState() is called by the IntelliJ persistence framework (background thread).
    // Plain ArrayList is not thread-safe; @Synchronized on `this` prevents CME.

    @Synchronized
    fun addEntry(entry: TaskTimeEntry) {
        val existing = entries.find { it.taskId == entry.taskId && it.date == entry.date.toString() }
        if (existing != null) {
            existing.durationSeconds += entry.durationSeconds
        } else {
            entries.add(TimeEntryData.fromDomain(entry))
        }
    }

    companion object {
        fun getInstance(project: Project): TimeEntriesState =
            project.getService(TimeEntriesState::class.java)
    }
}
