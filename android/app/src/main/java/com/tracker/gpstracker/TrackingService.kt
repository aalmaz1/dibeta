package com.tracker.gpstracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class TrackingService : Service() {

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var locationTracker: LocationTracker
    private lateinit var batteryMonitor: BatteryMonitor
    private lateinit var dataSender: DataSender
    private lateinit var wakeLock: PowerManager.WakeLock

    companion object {
        const val CHANNEL_ID = "tracking_channel"
        const val NOTIFICATION_ID = 1
        const val UPDATE_INTERVAL_MS = 30000L // 30 seconds
    }

    override fun onCreate() {
        super.onCreate()
        
        locationTracker = LocationTracker(this)
        batteryMonitor = BatteryMonitor(this)
        dataSender = DataSender()
        
        // Acquire wake lock
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Tracker::TrackingWakeLock"
        )
        wakeLock.acquire(10*60*1000L) // 10 minutes
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        createNotificationChannel()
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)

        startTracking()
        
        return START_STICKY
    }

    private fun startTracking() {
        serviceScope.launch {
            while (isActive) {
                try {
                    // Get location
                    val location = locationTracker.getCurrentLocation()
                    
                    // Get battery
                    val battery = batteryMonitor.getBatteryLevel()
                    
                    // Send to Firebase
                    if (location != null) {
                        dataSender.sendLocation(
                            lat = location.latitude,
                            lng = location.longitude,
                            accuracy = location.accuracy,
                            battery = battery
                        )
                    }
                    
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                
                delay(UPDATE_INTERVAL_MS)
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "GPS Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Location tracking service"
            }
            
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Phone Tracker Active")
            .setContentText("Sharing location in real-time")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
        if (::wakeLock.isInitialized && wakeLock.isHeld) {
            wakeLock.release()
        }
    }
}
