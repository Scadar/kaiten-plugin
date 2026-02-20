package com.github.scadar.kaitenplugin.infrastructure

import com.github.scadar.kaitenplugin.domain.TaskTimeEntry
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project
import com.intellij.util.xmlb.XmlSerializerUtil
import java.time.LocalDate

data class TimeEntryData(
    var taskId: Long = 0,
    var date: String = "",
    var durationSeconds: Long = 0
) {
    fun toDomain() = TaskTimeEntry(
        taskId = taskId,
        date = LocalDate.parse(date),
        durationSeconds = durationSeconds
    )

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

    fun addEntry(entry: TaskTimeEntry) {
        entries.add(TimeEntryData.fromDomain(entry))
    }

    fun getEntriesByTask(taskId: Long): List<TaskTimeEntry> {
        return entries.filter { it.taskId == taskId }.map { it.toDomain() }
    }

    fun getAllEntries(): Map<Long, List<TaskTimeEntry>> {
        return entries.map { it.toDomain() }.groupBy { it.taskId }
    }

    companion object {
        fun getInstance(project: Project): TimeEntriesState =
            project.getService(TimeEntriesState::class.java)
    }
}
