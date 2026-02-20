package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.Task
import com.github.scadar.kaitenplugin.domain.TaskMember
import com.google.gson.annotations.SerializedName
import java.time.LocalDate

data class TaskDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("column_id") val columnId: Long,
    @SerializedName("owner_id") val assigneeId: Long?,
    @SerializedName("members") val participants: List<TaskMemberDto>? = null,
    @SerializedName("due_date") val dueDate: String?,
) {
    fun toDomain() = Task(
        id = id,
        title = title,
        description = description,
        columnId = columnId,
        assigneeId = assigneeId,
        participants = participants?.map { TaskMember(id = it.id, fullName = it.fullName, email = it.email) } ?: emptyList(),
        dueDate = dueDate?.let {
            java.time.Instant.parse(it)
                .atZone(java.time.ZoneOffset.UTC)
                .toLocalDate()
        },
    )
}
