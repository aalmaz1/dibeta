package com.tracker.phone

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            val prefs = context.getSharedPreferences("tracker_prefs", Context.MODE_PRIVATE)
            val deviceId = prefs.getString("device_id", null)
            
            if (deviceId != null) {
                val serviceIntent = Intent(context, TrackingService::class.java).apply {
                    putExtra("device_id", deviceId)
                }
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}
