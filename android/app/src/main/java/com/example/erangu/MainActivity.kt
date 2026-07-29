package com.example.erangu

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    companion object {
        private const val APP_URL  = "https://nextstopmain.onrender.com/"
        private const val APP_HOST = "nextstopmain.onrender.com"
        private const val PERM_REQ = 1001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        requestNeededPermissions()

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled      = true
                domStorageEnabled      = true
                databaseEnabled        = true
                setSupportZoom(false)
                builtInZoomControls    = false
                displayZoomControls    = false
                mediaPlaybackRequiresUserGesture = false
                // Allow the web app to play audio (needed for alarm sound)
                allowFileAccess        = false
                allowContentAccess     = false
            }

            // Expose native bridge to website JavaScript
            addJavascriptInterface(NativeBridge(), "ERANGUAndroid")

            // Stay on the same host; open external links in browser
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView, request: WebResourceRequest
                ): Boolean = request.url.host != APP_HOST
            }

            // Forward geolocation permission from WebView to native
            webChromeClient = object : WebChromeClient() {
                override fun onGeolocationPermissionsShowPrompt(
                    origin: String,
                    callback: GeolocationPermissions.Callback
                ) {
                    val granted = hasLocationPermission()
                    callback.invoke(origin, granted, false)
                    if (!granted) requestNeededPermissions()
                }
            }

            if (savedInstanceState != null) {
                restoreState(savedInstanceState)
            } else {
                loadUrl(APP_URL)
            }
        }

        setContentView(webView)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onResume()  { super.onResume();  webView.onResume()  }
    override fun onPause()   { super.onPause();   webView.onPause()   }
    override fun onDestroy() { super.onDestroy(); webView.destroy()   }

    // ── Permissions ───────────────────────────────────────────────────────────

    private fun hasLocationPermission() =
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED ||
        ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED

    private fun requestNeededPermissions() {
        val needed = buildList {
            if (!hasLocationPermission()) {
                add(Manifest.permission.ACCESS_FINE_LOCATION)
                add(Manifest.permission.ACCESS_COARSE_LOCATION)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val notifGranted = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED
                if (!notifGranted) add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (needed.isNotEmpty()) requestPermissions(needed.toTypedArray(), PERM_REQ)
    }

    override fun onRequestPermissionsResult(
        requestCode: Int, permissions: Array<out String>, grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        // Notify the website that permissions changed so it can re-check
        webView.evaluateJavascript(
            "if(window.__eranguPermissionCallback) window.__eranguPermissionCallback();", null
        )
    }

    // ── JavaScript Bridge ─────────────────────────────────────────────────────
    //
    // The website calls these methods via:
    //   window.ERANGUAndroid.startTracking(label, lat, lng, radiusMeters)
    //   window.ERANGUAndroid.stopTracking()
    //   window.ERANGUAndroid.isAndroid()  → returns true
    //
    inner class NativeBridge {

        /** Called from website JS when the alarm is armed for a destination stop */
        @JavascriptInterface
        fun startTracking(label: String, latitude: Double, longitude: Double, radiusMeters: Int) {
            if (!hasLocationPermission()) {
                runOnUiThread { requestNeededPermissions() }
                return
            }
            val intent = LocationForegroundService.startIntent(
                this@MainActivity, label, latitude, longitude, radiusMeters
            )
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        }

        /** Called from website JS when the alarm is disarmed */
        @JavascriptInterface
        fun stopTracking() {
            startService(LocationForegroundService.stopIntent(this@MainActivity))
        }

        /** Let website JS detect it's running inside the Android app */
        @JavascriptInterface
        fun isAndroid(): Boolean = true

        /** Returns current foreground service status */
        @JavascriptInterface
        fun isTracking(): Boolean = LocationForegroundService.isRunning
    }
}
