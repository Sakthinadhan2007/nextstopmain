package com.example.erangu

import android.Manifest
import android.content.pm.PackageManager
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

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    requestAppPermissions()

    webView = WebView(this).apply {
      settings.javaScriptEnabled = true
      settings.domStorageEnabled = true
      settings.databaseEnabled = true
      settings.setSupportZoom(false)
      settings.mediaPlaybackRequiresUserGesture = false
      addJavascriptInterface(NativeTrackingBridge(), "ERANGUAndroid")
      webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
          return request.url.host != APP_HOST
        }
      }
      webChromeClient = object : WebChromeClient() {
        override fun onGeolocationPermissionsShowPrompt(
          origin: String,
          callback: GeolocationPermissions.Callback
        ) {
          if (hasLocationPermission()) {
            callback.invoke(origin, true, false)
          } else {
            requestAppPermissions()
            callback.invoke(origin, false, false)
          }
        }
      }

      if (savedInstanceState == null) loadUrl(APP_URL) else restoreState(savedInstanceState)
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

  private fun hasLocationPermission(): Boolean =
    ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
      ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

  private fun requestAppPermissions() {
    val permissions = buildList {
      if (!hasLocationPermission()) {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
      }
      if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
      ) add(Manifest.permission.POST_NOTIFICATIONS)
    }
    if (permissions.isNotEmpty()) requestPermissions(permissions.toTypedArray(), PERMISSION_REQUEST_CODE)
  }

  inner class NativeTrackingBridge {
    @JavascriptInterface
    fun startTracking(label: String, latitude: Double, longitude: Double, radiusMeters: Int) {
      if (!hasLocationPermission()) {
        runOnUiThread { requestAppPermissions() }
        return
      }
      val intent = LocationForegroundService.startIntent(this@MainActivity, label, latitude, longitude, radiusMeters)
      ContextCompat.startForegroundService(this@MainActivity, intent)
    }

    @JavascriptInterface
    fun stopTracking() {
      stopService(LocationForegroundService.stopIntent(this@MainActivity))
    }
  }

  companion object {
    private const val APP_URL = "https://nextstopmain.onrender.com/"
    private const val APP_HOST = "nextstopmain.onrender.com"
    private const val PERMISSION_REQUEST_CODE = 1001
  }
}
