import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { 
    getDatabase, 
    ref, 
    onValue, 
    set,
    off
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ==========================================
// CONFIG - ЗАМЕНИТЕ НА СВОИ ЗНАЧЕНИЯ
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCkjTO4oSRdCyehUsJ1QVj0KqdB_QzigAc",
  authDomain: "traaxcker.firebaseapp.com",
  databaseURL: "https://traaxcker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "traaxcker",
  storageBucket: "traaxcker.firebasestorage.app",
  messagingSenderId: "315863450054",
  appId: "1:315863450054:web:9accc8bdf57fda00c6f2c7",
  measurementId: "G-MM216YNWC3"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// ==========================================
// STATE
// ==========================================
let isLoginMode = true;
let currentUser = null;
let devices = {};
let map = null;
let markers = {};

// ==========================================
// DOM
// ==========================================
const authScreen = document.getElementById('auth-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authModeText = document.getElementById('auth-mode');
const addDeviceBtn = document.getElementById('add-device-btn');
const logoutBtn = document.getElementById('logout-btn');
const addModal = document.getElementById('add-modal');
const deviceIdInput = document.getElementById('device-id-input');
const qrSection = document.getElementById('qr-section');
const generatedIdDisplay = document.getElementById('generated-id');

// ==========================================
// AUTH
// ==========================================

toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authBtn.textContent = isLoginMode ? 'Sign In' : 'Create Account';
    authModeText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    toggleBtn.textContent = isLoginMode ? 'Sign Up' : 'Sign In';
});

authBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        alert('Please enter email and password');
        return;
    }
    
    authBtn.disabled = true;
    
    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        authBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        showDashboard();
        startTracking();
    } else {
        currentUser = null;
        stopTracking();
        showAuth();
    }
});

function showAuth() {
    authScreen.classList.add('active');
    dashboardScreen.classList.remove('active');
}

function showDashboard() {
    authScreen.classList.remove('active');
    dashboardScreen.classList.add('active');
    initMap();
}

// ==========================================
// MAP
// ==========================================

function initMap() {
    if (map) return;
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([55.7558, 37.6173], 10);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

function updateMarker(deviceId, device) {
    const { lat, lng } = device || {};
    if (!lat || !lng) return;
    
    const pos = [lat, lng];
    
    if (markers[deviceId]) {
        markers[deviceId].setLatLng(pos);
    } else {
        markers[deviceId] = L.marker(pos).addTo(map)
            .bindPopup(`<b>${deviceId}</b><br>Battery: ${device.battery}%`);
    }
}

// ==========================================
// DEVICES TRACKING
// ==========================================

function startTracking() {
    if (!currentUser) return;
    
    const devicesRef = ref(database, `users/${currentUser.uid}/devices`);
    
    onValue(devicesRef, (snapshot) => {
        devices = snapshot.val() || {};
        renderDevices();
        
        Object.entries(devices).forEach(([id, dev]) => updateMarker(id, dev));
        
        // Fit bounds
        const locations = Object.values(devices)
            .filter(d => d.lat && d.lng)
            .map(d => [d.lat, d.lng]);
        
        if (locations.length > 0 && map) {
            map.fitBounds(L.latLngBounds(locations), { padding: [50, 50], maxZoom: 15 });
        }
    });
}

function stopTracking() {
    // Cleanup
}

function renderDevices() {
    const list = document.getElementById('devices-list');
    const entries = Object.entries(devices);
    document.getElementById('device-count').textContent = entries.length;
    
    if (entries.length === 0) {
        list.innerHTML = '<div class="empty-state">No devices yet. Add a phone to start tracking.</div>';
        return;
    }
    
    list.innerHTML = entries.map(([id, dev]) => {
        const isOnline = dev.timestamp && (Date.now() - dev.timestamp < 300000);
        const time = dev.timestamp ? new Date(dev.timestamp).toLocaleTimeString() : 'Unknown';
        
        return `
            <div class="device-card" onclick="focusDevice('${id}')">
                <div class="device-header">
                    <div class="device-id">${id}</div>
                    <div class="device-status">
                        <span class="status-dot ${isOnline ? '' : 'offline'}"></span>
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="device-stats">
                    <div class="stat">🔋 <span class="stat-value">${dev.battery || '?'}%</span></div>
                    <div class="stat">📍 <span class="stat-value">${dev.lat ? dev.lat.toFixed(4) : '?'}</span></div>
                    <div class="stat">🕐 <span class="stat-value">${time}</span></div>
                    <div class="stat">📡 <span class="stat-value">${dev.accuracy ? Math.round(dev.accuracy) + 'm' : '?'}</span></div>
                </div>
            </div>
        `;
    }).join('');
}

window.focusDevice = (id) => {
    const dev = devices[id];
    if (dev?.lat && map) {
        map.flyTo([dev.lat, dev.lng], 16);
        markers[id]?.openPopup();
    }
};

// ==========================================
// ADD DEVICE MODAL
// ==========================================

addDeviceBtn.addEventListener('click', () => {
    addModal.classList.add('active');
    deviceIdInput.value = '';
    qrSection.classList.add('hidden');
});

window.closeModal = () => {
    addModal.classList.remove('active');
};

window.generateDevice = () => {
    const phoneNumber = deviceIdInput.value.trim();
    if (!phoneNumber) {
        alert('Please enter phone number');
        return;
    }
    
    // Sanitize for Firebase path
    const deviceId = phoneNumber.replace(/[.#$[\]]/g, '_');
    
    generatedIdDisplay.textContent = deviceId;
    qrSection.classList.remove('hidden');
    
    // Generate QR
    document.getElementById('qrcode').innerHTML = '';
    new QRCode(document.getElementById('qrcode'), {
        text: deviceId,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff"
    });
    
    // Save to Firebase
    if (currentUser) {
        const deviceRef = ref(database, `users/${currentUser.uid}/devices/${deviceId}`);
        set(deviceRef, {
            registeredAt: Date.now(),
            status: 'pending'
        });
    }
};

window.copyDeviceId = () => {
    navigator.clipboard.writeText(generatedIdDisplay.textContent)
        .then(() => alert('Device ID copied!'))
        .catch(() => alert('Failed to copy'));
};

// Close modal on outside click
addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal();
});
