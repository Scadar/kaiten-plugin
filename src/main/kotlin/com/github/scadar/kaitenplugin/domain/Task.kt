package com.github.scadar.kaitenplugin.domain

import java.time.LocalDate

data class Task(
    val id: Long,
    val title: String,
    val description: String?,
    val columnId: Long,
    val assigneeId: Long?,
    val participants: List<TaskMember> = emptyList(),
    val dueDate: LocalDate?,
)
