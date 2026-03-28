import { 
    auth, 
    database, 
    ref, 
    onValue, 
    off,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from './firebase-config.js';

// ==========================================
// App State
// ==========================================
const state = {
    user: null,
    devices: {},
    map: null,
    markers: {},
    activeDeviceId: null,
    isLoginMode: true
};

// ==========================================
// DOM Elements
// ==========================================
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const btnText = loginBtn.querySelector('.btn-text');
const btnLoader = loginBtn.querySelector('.btn-loader');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authModeText = document.getElementById('auth-mode-text');
const logoutBtn = document.getElementById('logout-btn');
const deviceList = document.getElementById('device-list');
const deviceCount = document.getElementById('device-count');
const userEmail = document.getElementById('user-email');
const connectionStatus = document.getElementById('connection-status');

// ==========================================
// Auth Functions
// ==========================================

// Toggle between login and signup
authToggleBtn.addEventListener('click', () => {
    state.isLoginMode = !state.isLoginMode;
    if (state.isLoginMode) {
        btnText.textContent = 'Sign In';
        authModeText.textContent = "Don't have an account?";
        authToggleBtn.textContent = 'Sign Up';
    } else {
        btnText.textContent = 'Create Account';
        authModeText.textContent = "Already have an account?";
        authToggleBtn.textContent = 'Sign In';
    }
});

// Handle form submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        if (state.isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification('Signed in successfully', 'success');
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            showNotification('Account created successfully', 'success');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showNotification(getAuthErrorMessage(error.code), 'error');
    } finally {
        setLoading(false);
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showNotification('Signed out', 'success');
    } catch (error) {
        showNotification('Error signing out', 'error');
    }
});

// Auth state listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        state.user = user;
        showDashboard();
        startDeviceTracking();
    } else {
        state.user = null;
        state.devices = {};
        stopDeviceTracking();
        showAuth();
    }
});

// ==========================================
// UI Functions
// ==========================================

function setLoading(loading) {
    loginBtn.disabled = loading;
    btnText.classList.toggle('hidden', loading);
    btnLoader.classList.toggle('hidden', !loading);
}

function showAuth() {
    authScreen.classList.add('active');
    dashboardScreen.classList.remove('active');
    emailInput.value = '';
    passwordInput.value = '';
}

function showDashboard() {
    authScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    userEmail.textContent = state.user.email;
    initMap();
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'An account already exists with this email',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/network-request-failed': 'Network error. Please check your connection'
    };
    return messages[code] || 'An error occurred. Please try again';
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==========================================
// Map Functions
// ==========================================

function initMap() {
    if (state.map) return;
    
    state.map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([37.5665, 126.9780], 12); // Seoul default
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(state.map);
    
    // Add zoom control to bottom right
    L.control.zoom({
        position: 'bottomright'
    }).addTo(state.map);
}

function updateDeviceMarker(deviceId, device) {
    const { lat, lng } = device.location || {};
    if (!lat || !lng) return;
    
    const position = [lat, lng];
    
    if (state.markers[deviceId]) {
        state.markers[deviceId].setLatLng(position);
    } else {
        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 20px;
                height: 20px;
                background: #007AFF;
                border: 3px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            "></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        
        state.markers[deviceId] = L.marker(position, { icon })
            .addTo(state.map)
            .bindPopup(`
                <strong>${device.name || 'Unknown Device'}</strong><br>
                Battery: ${device.battery || '?'}%<br>
                Updated: ${formatTime(device.timestamp)}
            `);
    }
}

// ==========================================
// Device Tracking
// ==========================================

let devicesRef = null;

function startDeviceTracking() {
    if (!state.user) return;
    
    const userId = sanitizeEmail(state.user.email);
    devicesRef = ref(database, `users/${userId}/devices`);
    
    onValue(devicesRef, (snapshot) => {
        const data = snapshot.val() || {};
        state.devices = data;
        renderDevices();
        
        // Update markers
        Object.entries(data).forEach(([deviceId, device]) => {
            updateDeviceMarker(deviceId, device);
        });
        
        // Fit bounds if we have devices with locations
        const locations = Object.values(data)
            .filter(d => d.location?.lat && d.location?.lng)
            .map(d => [d.location.lat, d.location.lng]);
        
        if (locations.length > 0 && state.map) {
            const bounds = L.latLngBounds(locations);
            state.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
        }
    });
}

function stopDeviceTracking() {
    if (devicesRef) {
        off(devicesRef);
        devicesRef = null;
    }
    
    // Clear markers
    Object.values(state.markers).forEach(marker => {
        if (state.map) state.map.removeLayer(marker);
    });
    state.markers = {};
    
    // Clear device list
    deviceList.innerHTML = '';
    deviceCount.textContent = '0';
}

function renderDevices() {
    const devices = Object.entries(state.devices);
    deviceCount.textContent = devices.length;
    
    deviceList.innerHTML = devices.map(([deviceId, device]) => {
        const location = device.location || {};
        const isOnline = isDeviceOnline(device.timestamp);
        
        return `
            <div class="device-card ${state.activeDeviceId === deviceId ? 'active' : ''}" 
                 data-device-id="${deviceId}">
                <div class="device-icon">📱</div>
                <div class="device-info">
                    <div class="device-name">${device.name || 'Unknown Device'}</div>
                    <div class="device-status ${isOnline ? '' : 'offline'}">
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="device-meta">
                    <div class="device-battery">${device.battery || '?'}%</div>
                    <div class="device-coords">
                        ${location.lat ? location.lat.toFixed(4) : '?'}, 
                        ${location.lng ? location.lng.toFixed(4) : '?'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Add click handlers
    deviceList.querySelectorAll('.device-card').forEach(card => {
        card.addEventListener('click', () => {
            const deviceId = card.dataset.deviceId;
            const device = state.devices[deviceId];
            
            state.activeDeviceId = deviceId;
            
            // Center map on device
            if (device?.location?.lat && state.map) {
                state.map.flyTo([device.location.lat, device.location.lng], 16);
                state.markers[deviceId]?.openPopup();
            }
            
            // Update active state
            deviceList.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

// ==========================================
// Utilities
// ==========================================

function sanitizeEmail(email) {
    return email.replace(/[.#$[\]]/g, '_');
}

function isDeviceOnline(timestamp) {
    if (!timestamp) return false;
    const lastUpdate = new Date(timestamp);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastUpdate > fiveMinutesAgo;
}

function formatTime(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

// Update connection status
window.addEventListener('online', () => {
    connectionStatus.textContent = 'Connected';
    connectionStatus.previousElementSibling.classList.add('online');
});

window.addEventListener('offline', () => {
    connectionStatus.textContent = 'Offline';
    connectionStatus.previousElementSibling.classList.remove('online');
});
