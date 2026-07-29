package com.example.erangu

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Request permissions early
        requestPermissionsIfNeeded()

        // Create WebView to load web app
        webView = WebView(this)
        setContentView(webView)

        configureWebView()
    }

    private fun configureWebView() {
        webView.apply {
            // Enable JavaScript
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.databaseEnabled = true
            settings.setGeolocationEnabled(true)

            // Enable file access for local assets
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.allowFileAccessFromFileURLs = true
            settings.allowUniversalAccessFromFileURLs = true

            // Enable responsive design
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.setSupportZoom(true)
            settings.builtInZoomControls = true
            settings.displayZoomControls = false

            // Improve performance
            settings.cacheMode = android.webkit.WebSettings.LOAD_DEFAULT

            // WebViewClient to handle page navigation
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    // Inject JavaScript bridge after page loads
                    injectJavaScriptBridge()
                }
            }

            // WebChromeClient for additional features
            webChromeClient = WebChromeClient()

            // Load the web app from local assets
            loadUrl("file:///android_asset/www/index.html")
        }
    }

    private fun injectJavaScriptBridge() {
        // Add JavaScript interface for native features
        webView.addJavascriptInterface(AndroidTrackingBridge(this), "ERANGUAndroid")
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
        flags: Int
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults, flags)
    }

    private fun requestPermissionsIfNeeded() {
        val needed = mutableListOf<String>()
        val fineGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted) {
            needed += Manifest.permission.ACCESS_FINE_LOCATION
            needed += Manifest.permission.ACCESS_COARSE_LOCATION
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
            val notifGranted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!notifGranted) needed += Manifest.permission.POST_NOTIFICATIONS
        }
        if (needed.isNotEmpty()) {
            requestPermissions(needed.toTypedArray(), 1001)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
