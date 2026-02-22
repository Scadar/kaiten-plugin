package com.github.scadar.kaitenplugin.domain

data class TaskMember(
    val id: Long,
    val fullName: String,
    val email: String,
    val type: Int = 0, // 1 = member, 2 = responsible
)
