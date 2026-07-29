package com.example.erangu

import android.content.Context
import android.content.Intent
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat

class AndroidTrackingBridge(private val context: Context) {

    @JavascriptInterface
    fun startTracking(label: String, latitude: Double, longitude: Double, radiusMeters: Int) {
        val intent = LocationForegroundService.startIntent(
            context, label, latitude, longitude, radiusMeters
        )
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
    }

    @JavascriptInterface
    fun stopTracking() {
        val intent = LocationForegroundService.stopIntent(context)
        context.startService(intent)
    }
}
