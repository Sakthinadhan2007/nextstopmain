package com.example.erangu

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.location.Location
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

class LocationForegroundService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var wakeLock: PowerManager.WakeLock? = null
    private var destination: Destination? = null
    private var triggered = false

    override fun onCreate() {
        super.onCreate()
        createChannels()
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        // Acquire CPU wake lock so GPS keeps running with screen off
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "erangu::LocationWakeLock"
        ).apply { acquire(3 * 60 * 60 * 1000L) } // max 3 hours
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
        triggered = false

        startForeground(TRACKING_NOTIF_ID, buildTrackingNotification("Heading to ${destination?.label}…"))
        startLocationUpdates()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopLocationUpdates()
        wakeLock?.let { if (it.isHeld) it.release() }
        super.onDestroy()
    }

    // ── Location ──────────────────────────────────────────────────────────────

    private fun startLocationUpdates() {
        val allowed = ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!allowed) { stopTracking(); return }

        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateDistanceMeters(UPDATE_DISTANCE_METERS)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                val target = destination ?: return
                val dist = distanceBetween(loc, target.latitude, target.longitude)
                updateTrackingNotification(dist, target.label)
                if (!triggered && dist <= target.radiusMeters) {
                    triggered = true
                    fireAlarm(target.label)
                }
            }
        }

        try {
            fusedLocationClient.requestLocationUpdates(
                request,
                locationCallback,
                mainLooper
            )
        } catch (e: SecurityException) {
            stopTracking()
        }
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) {
            fusedLocationClient.removeLocationUpdates(locationCallback)
        }
    }

    // ── Alarm ──────────────────────────────────────────────────────────────────

    private fun fireAlarm(label: String) {
        // High-priority alarm notification
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val alarmNotif = NotificationCompat.Builder(this, ALARM_CHANNEL_ID)
            .setContentTitle("⏰ Wake Up! Approaching $label")
            .setContentText("You are within the alert radius. Time to get ready!")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenIntent(), true)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        nm.notify(ALARM_NOTIF_ID, alarmNotif)

        // Vibrate pattern: long buzz
        vibrate()

        // Play alarm ringtone
        try {
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            val mp = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(applicationContext, alarmUri)
                isLooping = false
                prepare()
                start()
            }
            // Stop after 30 seconds automatically
            android.os.Handler(mainLooper).postDelayed({ mp.stop(); mp.release() }, 30_000)
        } catch (e: Exception) { /* ignore if alarm URI unavailable */ }

        stopTracking()
    }

    private fun vibrate() {
        val pattern = longArrayOf(0, 800, 200, 800, 200, 800, 200, 800)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(pattern, -1)
            }
        }
    }

    private fun fullScreenIntent(): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("alarm_triggered", true)
        }
        return PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun stopTracking() {
        stopLocationUpdates()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ── Notifications ──────────────────────────────────────────────────────────

    private fun buildTrackingNotification(text: String): Notification {
        val stopIntent = PendingIntent.getService(
            this, 0, stopIntent(this),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, TRACKING_CHANNEL_ID)
            .setContentTitle("ERANGU — Tracking Active")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setSilent(true)
            .addAction(android.R.drawable.ic_delete, "Stop", stopIntent)
            .build()
    }

    private fun updateTrackingNotification(distMeters: Float, label: String) {
        val distText = if (distMeters >= 1000f)
            "${"%.1f".format(distMeters / 1000f)} km to $label"
        else
            "${distMeters.toInt()} m to $label"

        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(TRACKING_NOTIF_ID, buildTrackingNotification(distText))
    }

    private fun createChannels() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Silent ongoing tracking channel
        nm.createNotificationChannel(
            NotificationChannel(TRACKING_CHANNEL_ID, "Location Tracking", NotificationManager.IMPORTANCE_LOW)
                .apply { description = "Shows live distance while ERANGU tracks your journey" }
        )

        // High-priority alarm channel
        nm.createNotificationChannel(
            NotificationChannel(ALARM_CHANNEL_ID, "Stop Alarm", NotificationManager.IMPORTANCE_HIGH)
                .apply {
                    description = "Fires when you approach your destination stop"
                    enableVibration(true)
                    setBypassDnd(true)
                }
        )
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private fun distanceBetween(loc: Location, lat: Double, lng: Double): Float {
        val result = FloatArray(1)
        Location.distanceBetween(loc.latitude, loc.longitude, lat, lng, result)
        return result[0]
    }

    private data class Destination(
        val label: String,
        val latitude: Double,
        val longitude: Double,
        val radiusMeters: Int
    )

    companion object {
        const val TRACKING_CHANNEL_ID = "erangu_tracking"
        const val ALARM_CHANNEL_ID    = "erangu_alarm"
        const val TRACKING_NOTIF_ID   = 1001
        const val ALARM_NOTIF_ID      = 1002

        private const val ACTION_STOP           = "com.example.erangu.STOP_TRACKING"
        private const val EXTRA_LABEL           = "label"
        private const val EXTRA_LATITUDE        = "latitude"
        private const val EXTRA_LONGITUDE       = "longitude"
        private const val EXTRA_RADIUS_METERS   = "radiusMeters"
        private const val UPDATE_INTERVAL_MS    = 4_000L
        private const val UPDATE_DISTANCE_METERS = 15f
        private const val DEFAULT_RADIUS_METERS = 800

        fun startIntent(
            context: Context,
            label: String,
            latitude: Double,
            longitude: Double,
            radiusMeters: Int
        ): Intent = Intent(context, LocationForegroundService::class.java).apply {
            putExtra(EXTRA_LABEL, label)
            putExtra(EXTRA_LATITUDE, latitude)
            putExtra(EXTRA_LONGITUDE, longitude)
            putExtra(EXTRA_RADIUS_METERS, radiusMeters)
        }

        fun stopIntent(context: Context): Intent =
            Intent(context, LocationForegroundService::class.java).setAction(ACTION_STOP)
    }
}
