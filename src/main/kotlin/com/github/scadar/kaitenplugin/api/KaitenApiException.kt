package com.github.scadar.kaitenplugin.api

sealed class KaitenApiException(message: String) : Exception(message) {
    class Unauthorized(message: String = "Unauthorized: Invalid token") : KaitenApiException(message)
    class Forbidden(message: String = "Forbidden: Insufficient permissions") : KaitenApiException(message)
    class NotFound(message: String = "Resource not found") : KaitenApiException(message)
    class ServerError(message: String = "Server error occurred") : KaitenApiException(message)
    class NetworkError(message: String = "Network error occurred") : KaitenApiException(message)
    class TimeoutError(message: String = "Request timeout") : KaitenApiException(message)
}
