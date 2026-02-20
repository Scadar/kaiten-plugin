package com.github.scadar.kaitenplugin.domain

data class Space(
    val id: Long,
    val name: String,
    val archived: Boolean = false
)
