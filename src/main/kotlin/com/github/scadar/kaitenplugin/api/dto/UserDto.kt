package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.User
import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("id") val id: Long,
    @SerializedName("full_name") val name: String,
    @SerializedName("email") val email: String
) {
    fun toDomain() = User(id, name, email)
}
