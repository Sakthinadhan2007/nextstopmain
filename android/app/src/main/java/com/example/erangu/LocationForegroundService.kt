package com.example.erangu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

class LocationForegroundService : Service(), LocationListener {
    private lateinit var locationManager: LocationManager
    private var destination: Destination? = null
    private var triggered = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        locationManager = getSystemService(LocationManager::class.java)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopTracking()
            return START_NOT_STICKY
        }
        destination = Destination(
            label = intent?.getStringExtra(EXTRA_LABEL) ?: "your destination",
            latitude = intent?.getDoubleExtra(EXTRA_LATITUDE, 0.0) ?: 0.0,
            longitude = intent?.getDoubleExtra(EXTRA_LONGITUDE, 0.0) ?: 0.0,
            radiusMeters = intent?.getIntExtra(EXTRA_RADIUS_METERS, DEFAULT_RADIUS_METERS) ?: DEFAULT_RADIUS_METERS
        )
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ERANGU tracking")
            .setContentText("Tracking ${destination?.label} even when the app is in the background")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()

        startForeground(1, notification)
        requestLocationUpdates()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onLocationChanged(location: Location) {
        val target = destination ?: return
        val results = FloatArray(1)
        Location.distanceBetween(location.latitude, location.longitude, target.latitude, target.longitude, results)
        if (!triggered && results[0] <= target.radiusMeters) {
            triggered = true
            showArrivalAlert(target.label)
            stopTracking()
        }
    }

    override fun onDestroy() {
        if (::locationManager.isInitialized) locationManager.removeUpdates(this)
        super.onDestroy()
    }

    private fun requestLocationUpdates() {
        val allowed = ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!allowed) {
            stopTracking()
            return
        }
        if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this)
        }
        if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, UPDATE_INTERVAL_MS, UPDATE_DISTANCE_METERS, this)
        }
    }

    private fun showArrivalAlert(label: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ERANGU: destination nearby")
            .setContentText("You are near $label")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .setAutoCancel(true)
            .build()
        getSystemService(NotificationManager::class.java)?.notify(ALERT_NOTIFICATION_ID, notification)
        val vibrator = getSystemService(Vibrator::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 1000, 200, 1000), -1))
        } else {
            @Suppress("DEPRECATION") vibrator?.vibrate(longArrayOf(0, 1000, 200, 1000), -1)
        }
    }

    private fun stopTracking() {
        if (::locationManager.isInitialized) locationManager.removeUpdates(this)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createChannel() {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "ERANGU tracking",
            NotificationManager.IMPORTANCE_LOW
        )
        val manager = getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
    }

    companion object {
        const val CHANNEL_ID = "erangu_tracking"
        private const val ACTION_STOP = "com.example.erangu.STOP_TRACKING"
        private const val EXTRA_LABEL = "label"
        private const val EXTRA_LATITUDE = "latitude"
        private const val EXTRA_LONGITUDE = "longitude"
        private const val EXTRA_RADIUS_METERS = "radiusMeters"
        private const val UPDATE_INTERVAL_MS = 5_000L
        private const val UPDATE_DISTANCE_METERS = 10f
        private const val DEFAULT_RADIUS_METERS = 600
        private const val ALERT_NOTIFICATION_ID = 2

        fun startIntent(context: Context, label: String, latitude: Double, longitude: Double, radiusMeters: Int): Intent =
            Intent(context, LocationForegroundService::class.java).apply {
                putExtra(EXTRA_LABEL, label)
                putExtra(EXTRA_LATITUDE, latitude)
                putExtra(EXTRA_LONGITUDE, longitude)
                putExtra(EXTRA_RADIUS_METERS, radiusMeters)
            }

        fun stopIntent(context: Context): Intent =
            Intent(context, LocationForegroundService::class.java).setAction(ACTION_STOP)
    }

    private data class Destination(val label: String, val latitude: Double, val longitude: Double, val radiusMeters: Int)
}
