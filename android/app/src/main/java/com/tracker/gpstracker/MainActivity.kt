package com.tracker.gpstracker

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import com.tracker.gpstracker.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private lateinit var auth: FirebaseAuth
    private var isLoginMode = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        auth = Firebase.auth

        // Check if already logged in
        if (auth.currentUser != null) {
            startTrackingService()
            finish()
            return
        }

        setupUI()
    }

    private fun setupUI() {
        binding.authButton.setOnClickListener {
            val email = binding.emailInput.text.toString().trim()
            val password = binding.passwordInput.text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                showToast("Please enter email and password")
                return@setOnClickListener
            }

            if (isLoginMode) {
                login(email, password)
            } else {
                signup(email, password)
            }
        }

        binding.toggleModeButton.setOnClickListener {
            isLoginMode = !isLoginMode
            updateUIForMode()
        }

        updateUIForMode()
    }

    private fun updateUIForMode() {
        if (isLoginMode) {
            binding.authButton.text = "Sign In"
            binding.toggleModeButton.text = "Don't have an account? Sign Up"
            binding.titleText.text = "Phone Tracker"
        } else {
            binding.authButton.text = "Create Account"
            binding.toggleModeButton.text = "Already have an account? Sign In"
            binding.titleText.text = "Create Account"
        }
    }

    private fun login(email: String, password: String) {
        lifecycleScope.launch {
            try {
                binding.authButton.isEnabled = false
                auth.signInWithEmailAndPassword(email, password).await()
                showToast("Signed in successfully")
                requestPermissionsAndStart()
            } catch (e: Exception) {
                binding.authButton.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun signup(email: String, password: String) {
        lifecycleScope.launch {
            try {
                binding.authButton.isEnabled = false
                auth.createUserWithEmailAndPassword(email, password).await()
                showToast("Account created")
                requestPermissionsAndStart()
            } catch (e: Exception) {
                binding.authButton.isEnabled = true
                showToast("Error: ${e.message}")
            }
        }
    }

    private fun requestPermissionsAndStart() {
        // Request battery optimization ignore
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = getSystemService(POWER_SERVICE) as android.os.PowerManager
            if (!powerManager.isIgnoringBatteryOptimizations(packageName)) {
                AlertDialog.Builder(this)
                    .setTitle("Battery Optimization")
                    .setMessage("Please disable battery optimization for reliable tracking")
                    .setPositiveButton("Open Settings") { _, _ ->
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                            data = Uri.parse("package:$packageName")
                        }
                        startActivity(intent)
                    }
                    .setNegativeButton("Skip", null)
                    .show()
            }
        }

        startTrackingService()
        finish()
    }

    private fun startTrackingService() {
        val serviceIntent = Intent(this, TrackingService::class.java)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun showToast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}
