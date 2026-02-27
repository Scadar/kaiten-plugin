package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.Space
import com.google.gson.annotations.SerializedName

data class SpaceDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val name: String,
    @SerializedName("archived") val archived: Boolean = false
) {
    fun toDomain() = Space(id, name, archived)
}
