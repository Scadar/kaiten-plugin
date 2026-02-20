package com.github.scadar.kaitenplugin.api.dto

import com.github.scadar.kaitenplugin.domain.TaskMember
import com.google.gson.annotations.SerializedName

data class TaskMemberDto(
    @SerializedName("id") val id: Long,
    @SerializedName("full_name") val fullName: String,
    @SerializedName("email") val email: String,
) {
    fun toDomain() = TaskMember(
        id = id,
        fullName = fullName,
        email = email,
    )
}
