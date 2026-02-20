package com.github.scadar.kaitenplugin.domain

import java.time.LocalDate

data class TaskTimeEntry(
    val taskId: Long,
    val date: LocalDate,
    val durationSeconds: Long
)
