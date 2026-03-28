package com.tracker.phone

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.location.Location
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.*
import com.google.firebase.database.FirebaseDatabase
import kotlinx.coroutines.*
import kotlin.math.abs

class TrackingService : Service() {

    private lateinit var fusedClient: FusedLocationProviderClient
    private lateinit var prefs: SharedPreferences
    private lateinit var database: FirebaseDatabase
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    private var deviceId: String = ""
    private var lastLocation: Location? = null
    private var lastBattery: Int = -1
    
    companion object {
        const val CHANNEL_ID = "tracking_channel"
        const val NOTIFICATION_ID = 1
        const val UPDATE_INTERVAL = 30000L // 30 seconds
        const val MIN_DISTANCE = 50f // 50 meters
        const val LOW_BATTERY_THRESHOLD = 20
    }

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        prefs = getSharedPreferences("tracker_prefs", MODE_PRIVATE)
        database = FirebaseDatabase.getInstance()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        deviceId = intent?.getStringExtra("device_id") 
            ?: prefs.getString("device_id", "") 
            ?: ""
        
        if (deviceId.isEmpty()) {
            stopSelf()
            return START_NOT_STICKY
        }
        
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification())
        
        startTracking()
        
        return START_STICKY
    }

    private fun startTracking() {
        serviceScope.launch {
            while (isActive) {
                try {
                    val location = getCurrentLocation()
                    val battery = getBatteryLevel()
                    
                    if (location != null) {
                        val shouldSend = shouldSendUpdate(location, battery)
                        
                        if (shouldSend) {
                            sendToFirebase(location, battery)
                            lastLocation = location
                            lastBattery = battery
                        }
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
                
                delay(UPDATE_INTERVAL)
            }
        }
    }
    
    private suspend fun getCurrentLocation(): Location? = kotlinx.coroutines.suspendCancellableCoroutine { cont ->
        try {
            val request = LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                5000L
            ).apply {
                setWaitForAccurateLocation(true)
            }.build()

            val callback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    fusedClient.removeLocationUpdates(this)
                    cont.resume(result.lastLocation) {}
                }
            }

            if (ActivityCompat.checkSelfPermission(
                    this,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED
            ) {
                fusedClient.requestLocationUpdates(
                    request,
                    callback,
                    Looper.getMainLooper()
                )
            } else {
                cont.resume(null) {}
            }
            
            cont.invokeOnCancellation {
                fusedClient.removeLocationUpdates(callback)
            }
        } catch (e: Exception) {
            cont.resume(null) {}
        }
    }
    
    private fun shouldSendUpdate(location: Location, battery: Int): Boolean {
        // Always send if first location
        if (lastLocation == null) return true
        
        // Send if moved more than 50m
        val distance = lastLocation!!.distanceTo(location)
        if (distance > MIN_DISTANCE) return true
        
        // Send if battery changed significantly or is low
        if (abs(battery - lastBattery) >= 5) return true
        if (battery <= LOW_BATTERY_THRESHOLD && lastBattery > LOW_BATTERY_THRESHOLD) return true
        
        // Send if last update was more than 5 minutes ago
        val timeSinceLast = System.currentTimeMillis() - (lastLocation?.time ?: 0)
        if (timeSinceLast > 300000) return true
        
        return false
    }
    
    private fun getBatteryLevel(): Int {
        val intent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val level = intent?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = intent?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        return if (level >= 0 && scale > 0) (level * 100 / scale) else -1
    }
    
    private fun sendToFirebase(location: Location, battery: Int) {
        val data = hashMapOf(
            "lat" to location.latitude,
            "lng" to location.longitude,
            "accuracy" to location.accuracy,
            "battery" to battery,
            "timestamp" to System.currentTimeMillis(),
            "status" to "online"
        )
        
        // Find user by device ID (scan all users)
        database.reference.child("users").get()
            .addOnSuccessListener { usersSnapshot ->
                usersSnapshot.children.forEach { userSnapshot ->
                    val deviceRef = userSnapshot.child("devices").child(deviceId).ref
                    deviceRef.updateChildren(data as Map<String, Any>)
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
                description = "Location tracking is active"
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("📍 Phone Tracker Active")
            .setContentText("Sharing location: $deviceId")
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
    }
}
