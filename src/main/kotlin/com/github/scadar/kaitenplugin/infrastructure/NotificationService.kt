package com.github.scadar.kaitenplugin.infrastructure

import com.github.scadar.kaitenplugin.api.KaitenApiException
import com.intellij.notification.Notification
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project

@Service
class NotificationService {

    fun showError(project: Project?, title: String, message: String) {
        showNotification(project, title, message, NotificationType.ERROR)
    }

    fun showWarning(project: Project?, title: String, message: String) {
        showNotification(project, title, message, NotificationType.WARNING)
    }

    fun showInfo(project: Project?, title: String, message: String) {
        showNotification(project, title, message, NotificationType.INFORMATION)
    }

    fun showApiError(project: Project?, exception: KaitenApiException) {
        val (title, message, type) = when (exception) {
            is KaitenApiException.Unauthorized -> Triple(
                "Authentication Failed",
                "Your API token is invalid or expired. Please check your settings.",
                NotificationType.ERROR
            )
            is KaitenApiException.Forbidden -> Triple(
                "Access Denied",
                "You don't have permission to access this resource.",
                NotificationType.WARNING
            )
            is KaitenApiException.NotFound -> Triple(
                "Resource Not Found",
                "The requested resource was not found.",
                NotificationType.WARNING
            )
            is KaitenApiException.ServerError -> Triple(
                "Server Error",
                "Kaiten server encountered an error: ${exception.message}",
                NotificationType.ERROR
            )
            is KaitenApiException.NetworkError -> Triple(
                "Network Error",
                "Failed to connect to Kaiten server: ${exception.message}",
                NotificationType.ERROR
            )
            is KaitenApiException.TimeoutError -> Triple(
                "Request Timeout",
                "Request to Kaiten server timed out. Please try again.",
                NotificationType.WARNING
            )
        }

        showNotification(project, title, message, type)
    }

    private fun showNotification(
        project: Project?,
        title: String,
        content: String,
        type: NotificationType
    ) {
        val notificationGroup = NotificationGroupManager.getInstance()
            .getNotificationGroup("Kaiten Notifications")

        val notification = notificationGroup.createNotification(title, content, type)
        notification.notify(project)
    }

    companion object {
        fun getInstance(): NotificationService = service()
    }
}
