package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.Column
import com.google.gson.annotations.SerializedName

data class ColumnDto(
    @SerializedName("id") val id: Long,
    @SerializedName("title") val name: String,
    @SerializedName("position") val position: Int
) {
    fun toDomain() = Column(id, name, position)
}
