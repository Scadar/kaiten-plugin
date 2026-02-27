package com.github.scadar.kaitenplugin.domain

import java.time.LocalDate

data class BranchTimeEntry(
    val branchName: String,
    val date: LocalDate,
    val durationSeconds: Long
)
