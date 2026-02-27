package com.github.scadar.kaitenplugin.infrastructure

import com.intellij.openapi.diagnostic.Logger
import com.intellij.util.net.ssl.CertificateManager
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext

class HttpClientProvider(private val token: String) {

    private val LOG = Logger.getInstance(HttpClientProvider::class.java)

    fun createClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor { message ->
            LOG.debug("[OkHttp] $message")
        }.apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val authInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("Authorization", "Bearer $token")
                .addHeader("Content-Type", "application/json")
                .build()
            chain.proceed(request)
        }

        val builder = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)

        // Use IntelliJ's CertificateManager so OkHttp trusts the same certificates as the
        // IDE itself: the OS/system trust store + any certs the user has already accepted
        // via IntelliJ's "Untrusted certificate" dialog. This fixes failures that occur when
        // the server certificate is signed by a CA present in the OS store but absent from
        // the bundled JVM trust store.
        val ideTrustManager = CertificateManager.getInstance().trustManager
        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, arrayOf(ideTrustManager), null)
        builder.sslSocketFactory(sslContext.socketFactory, ideTrustManager)

        return builder.build()
    }
}
