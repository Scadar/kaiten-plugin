package com.github.scadar.kaitenplugin.infrastructure

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

class CacheManager<K, V>(
    private val ttlMinutes: Long = 5
) {
    private data class CacheEntry<V>(
        val value: V,
        val timestamp: Long
    )

    private val cache = ConcurrentHashMap<K, CacheEntry<V>>()

    fun put(key: K, value: V) {
        cache[key] = CacheEntry(value, System.currentTimeMillis())
    }

    fun get(key: K): V? {
        val entry = cache[key] ?: return null
        val isExpired = System.currentTimeMillis() - entry.timestamp > TimeUnit.MINUTES.toMillis(ttlMinutes)

        return if (isExpired) {
            cache.remove(key)
            null
        } else {
            entry.value
        }
    }

    fun invalidate(key: K) {
        cache.remove(key)
    }

    fun invalidateAll() {
        cache.clear()
    }

    fun containsKey(key: K): Boolean {
        val value = get(key)
        return value != null
    }
}
