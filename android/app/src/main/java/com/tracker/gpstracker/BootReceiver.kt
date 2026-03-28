package com.tracker.gpstracker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import com.google.firebase.auth.FirebaseAuth

class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Only start if user is logged in
            if (FirebaseAuth.getInstance().currentUser != null) {
                val serviceIntent = Intent(context, TrackingService::class.java)
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            }
        }
    }
}
