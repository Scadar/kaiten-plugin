package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.Task
import com.google.gson.annotations.SerializedName
import java.time.LocalDate

data class TaskDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val title: String,
    @SerializedName("description") val description: String?,
    @SerializedName("column_id") val columnId: Long,
    @SerializedName("owner_id") val assigneeId: Long?,
    @SerializedName("members") val participants: List<Long>? = null,
    @SerializedName("due_date") val dueDate: String?,
    @SerializedName("tags") val tags: List<String>? = null
) {
    fun toDomain() = Task(
        id = id,
        title = title,
        description = description,
        columnId = columnId,
        assigneeId = assigneeId,
        participants = participants ?: emptyList(),
        dueDate = dueDate?.let { LocalDate.parse(it) },
        tags = tags ?: emptyList()
    )
}
