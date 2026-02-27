package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.Board
import com.google.gson.annotations.SerializedName

data class BoardDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val name: String,
    @SerializedName("space_id") val spaceId: Long
) {
    fun toDomain() = Board(id, name, spaceId)
}
