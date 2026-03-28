package com.tracker.phone

import android.Manifest
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.tracker.phone.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var prefs: SharedPreferences
    private val PERMISSIONS_REQUEST = 100

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        prefs = getSharedPreferences("tracker_prefs", MODE_PRIVATE)
        
        // Check if device ID already set
        val savedDeviceId = prefs.getString("device_id", null)
        if (savedDeviceId != null) {
            startTrackingService(savedDeviceId)
            finish()
            return
        }
        
        setupUI()
    }
    
    private fun setupUI() {
        binding.saveButton.setOnClickListener {
            val deviceId = binding.deviceIdInput.text.toString().trim()
            
            if (deviceId.isEmpty()) {
                Toast.makeText(this, "Please enter device ID", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            
            // Save to SharedPreferences
            prefs.edit().putString("device_id", deviceId).apply()
            
            // Request permissions and start
            requestPermissions(deviceId)
        }
    }
    
    private fun requestPermissions(deviceId: String) {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.FOREGROUND_SERVICE
        )
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            permissions.add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
        
        val notGranted = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        
        if (notGranted.isEmpty()) {
            checkBatteryOptimization(deviceId)
        } else {
            ActivityCompat.requestPermissions(this, notGranted.toTypedArray(), PERMISSIONS_REQUEST)
        }
    }
    
    private fun checkBatteryOptimization(deviceId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(POWER_SERVICE) as android.os.PowerManager
            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                AlertDialog.Builder(this)
                    .setTitle("Battery Optimization")
                    .setMessage("Please disable battery optimization for reliable tracking")
                    .setPositiveButton("Settings") { _, _ ->
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        startActivity(intent)
                    }
                    .setNegativeButton("Skip") { _, _ ->
                        startTrackingService(deviceId)
                    }
                    .show()
                return
            }
        }
        startTrackingService(deviceId)
    }
    
    private fun startTrackingService(deviceId: String) {
        val intent = Intent(this, TrackingService::class.java).apply {
            putExtra("device_id", deviceId)
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
        
        Toast.makeText(this, "Tracking started", Toast.LENGTH_SHORT).show()
        finish()
    }
    
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                val deviceId = prefs.getString("device_id", "") ?: ""
                checkBatteryOptimization(deviceId)
            } else {
                Toast.makeText(this, "Permissions required for tracking", Toast.LENGTH_LONG).show()
            }
        }
    }
}
