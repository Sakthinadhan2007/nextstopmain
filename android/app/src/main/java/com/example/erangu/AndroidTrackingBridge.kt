package com.example.erangu

import android.app.Activity
import android.webkit.JavascriptInterface
import android.widget.Toast

/**
 * JavaScript bridge that the web app (client/src/App.tsx) calls via
 * `window.ERANGUAndroid.startTracking(...)` and `window.ERANGUAndroid.stopTracking()`.
 *
 * This delegates to the native [LocationForegroundService] so that
 * background GPS tracking and the wake-up alarm work even when the
 * WebView is paused or the screen is off.
 */
class AndroidTrackingBridge(private val activity: Activity) {

    @JavascriptInterface
    fun startTracking(label: String, latitude: Double, longitude: Double, radiusMeters: Int) {
        activity.runOnUiThread {
            val intent = LocationForegroundService.startIntent(
                activity, label, latitude, longitude, radiusMeters
            )
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                activity.startForegroundService(intent)
            } else {
                activity.startService(intent)
            }
            Toast.makeText(activity, "Tracking: $label", Toast.LENGTH_SHORT).show()
        }
    }

    @JavascriptInterface
    fun stopTracking() {
        activity.runOnUiThread {
            activity.startService(LocationForegroundService.stopIntent(activity))
            Toast.makeText(activity, "Tracking stopped", Toast.LENGTH_SHORT).show()
        }
    }
}
