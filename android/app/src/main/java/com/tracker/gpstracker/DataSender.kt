package com.tracker.gpstracker

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.FirebaseDatabase
import java.util.*

class DataSender {

    private val database = FirebaseDatabase.getInstance()
    private val auth = FirebaseAuth.getInstance()

    fun sendLocation(lat: Double, lng: Double, accuracy: Float, battery: Int) {
        val user = auth.currentUser ?: return
        val userId = sanitizeEmail(user.email ?: return)
        val deviceId = getDeviceId()

        val data = hashMapOf(
            "location" to hashMapOf(
                "lat" to lat,
                "lng" to lng,
                "accuracy" to accuracy
            ),
            "battery" to battery,
            "timestamp" to Date().time,
            "status" to "online",
            "name" to deviceId
        )

        database.reference
            .child("users")
            .child(userId)
            .child("devices")
            .child(deviceId)
            .setValue(data)
    }

    private fun sanitizeEmail(email: String): String {
        return email.replace(Regex("[.#$\\[\\]]"), "_")
    }

    private fun getDeviceId(): String {
        return android.os.Build.MODEL.replace(" ", "_")
    }
}
