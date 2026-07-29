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

    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback
    private var wakeLock: PowerManager.WakeLock? = null
    private var destination: Destination? = null
    private var triggered = false

    companion object {
        var isRunning = false
            private set

        private const val TRACKING_CHANNEL = "erangu_tracking"
        private const val ALARM_CHANNEL    = "erangu_alarm"
        private const val TRACKING_NOTIF   = 1001
        private const val ALARM_NOTIF      = 1002

        private const val ACTION_STOP      = "com.example.erangu.STOP"
        private const val KEY_LABEL        = "label"
        private const val KEY_LAT          = "lat"
        private const val KEY_LNG          = "lng"
        private const val KEY_RADIUS       = "radius"
        private const val DEFAULT_RADIUS   = 800

        private const val INTERVAL_MS      = 4_000L
        private const val MIN_DISTANCE_M   = 15f

        fun startIntent(
            ctx: Context, label: String,
            lat: Double, lng: Double, radius: Int
        ): Intent = Intent(ctx, LocationForegroundService::class.java).apply {
            putExtra(KEY_LABEL,  label)
            putExtra(KEY_LAT,    lat)
            putExtra(KEY_LNG,    lng)
            putExtra(KEY_RADIUS, radius)
        }

        fun stopIntent(ctx: Context): Intent =
            Intent(ctx, LocationForegroundService::class.java).setAction(ACTION_STOP)
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)

        // Partial wake lock: keeps CPU alive when screen turns off
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK, "erangu::TrackingWakeLock"
        ).apply { acquire(4 * 60 * 60 * 1000L) /* max 4 h */ }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopTracking(); return START_NOT_STICKY }

        destination = Destination(
            label  = intent?.getStringExtra(KEY_LABEL) ?: "destination",
            lat    = intent?.getDoubleExtra(KEY_LAT, 0.0) ?: 0.0,
            lng    = intent?.getDoubleExtra(KEY_LNG, 0.0) ?: 0.0,
            radius = intent?.getIntExtra(KEY_RADIUS, DEFAULT_RADIUS) ?: DEFAULT_RADIUS
        )
        triggered = false
        isRunning = true

        startForeground(TRACKING_NOTIF, buildTrackingNotif("Heading to ${destination?.label}…"))
        startLocationUpdates()
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopLocationUpdates()
        wakeLock?.let { if (it.isHeld) it.release() }
        isRunning = false
        super.onDestroy()
    }

    // ── Location ──────────────────────────────────────────────────────────────

    private fun startLocationUpdates() {
        val ok = ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!ok) { stopTracking(); return }

        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
            .setMinUpdateDistanceMeters(MIN_DISTANCE_M)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(res: LocationResult) {
                val loc    = res.lastLocation ?: return
                val target = destination     ?: return
                val dist   = distMeters(loc, target.lat, target.lng)

                updateTrackingNotif(dist, target.label)

                if (!triggered && dist <= target.radius) {
                    triggered = true
                    fireAlarm(target.label)
                }
            }
        }

        try {
            fusedClient.requestLocationUpdates(req, locationCallback, mainLooper)
        } catch (e: SecurityException) { stopTracking() }
    }

    private fun stopLocationUpdates() {
        if (::locationCallback.isInitialized) fusedClient.removeLocationUpdates(locationCallback)
    }

    // ── Alarm ──────────────────────────────────────────────────────────────────

    private fun fireAlarm(label: String) {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val openApp = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java)
                .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
                .putExtra("alarm", true),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        nm.notify(ALARM_NOTIF, NotificationCompat.Builder(this, ALARM_CHANNEL)
            .setContentTitle("⏰ Wake Up! — $label")
            .setContentText("You are approaching your destination. Time to get off!")
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(openApp, true)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)
            .build()
        )

        vibrate()
        playAlarm()
        stopTracking()
    }

    private fun vibrate() {
        val pattern = longArrayOf(0, 900, 200, 900, 200, 900, 200, 900)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        } else {
            @Suppress("DEPRECATION")
            val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1))
            } else {
                @Suppress("DEPRECATION") v.vibrate(pattern, -1)
            }
        }
    }

    private fun playAlarm() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
            MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                setDataSource(applicationContext, uri)
                isLooping = false
                prepare(); start()
                android.os.Handler(mainLooper).postDelayed({ stop(); release() }, 25_000)
            }
        } catch (_: Exception) {}
    }

    private fun stopTracking() {
        stopLocationUpdates()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // ── Notifications ──────────────────────────────────────────────────────────

    private fun buildTrackingNotif(text: String): Notification {
        val stopPi = PendingIntent.getService(
            this, 0, stopIntent(this),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        return NotificationCompat.Builder(this, TRACKING_CHANNEL)
            .setContentTitle("ERANGU — Tracking Active")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setSilent(true)
            .addAction(android.R.drawable.ic_delete, "Stop", stopPi)
            .build()
    }

    private fun updateTrackingNotif(dist: Float, label: String) {
        val text = if (dist >= 1000f) "${"%.1f".format(dist / 1000f)} km to $label"
                   else "${dist.toInt()} m to $label"
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.notify(TRACKING_NOTIF, buildTrackingNotif(text))
    }

    private fun createNotificationChannels() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(TRACKING_CHANNEL, "Location Tracking", NotificationManager.IMPORTANCE_LOW)
                .apply { description = "Ongoing distance tracking notification" }
        )
        nm.createNotificationChannel(
            NotificationChannel(ALARM_CHANNEL, "Stop Alarm", NotificationManager.IMPORTANCE_HIGH)
                .apply { description = "Alert when you reach your stop"; setBypassDnd(true); enableVibration(true) }
        )
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private fun distMeters(loc: Location, lat: Double, lng: Double): Float {
        val r = FloatArray(1)
        Location.distanceBetween(loc.latitude, loc.longitude, lat, lng, r)
        return r[0]
    }

    private data class Destination(val label: String, val lat: Double, val lng: Double, val radius: Int)
}
