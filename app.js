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
    off
} from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// ══════════════════════════════════════════
// FIREBASE CONFIG
// ══════════════════════════════════════════
const firebaseConfig = {
    apiKey: "AIzaSyCkjTO4oSRdCyehUsJ1QVj0KqdB_QzigAc",
    authDomain: "traaxcker.firebaseapp.com",
    databaseURL: "https://traaxcker-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "traaxcker",
    storageBucket: "traaxcker.firebasestorage.app",
    messagingSenderId: "315863450054",
    appId: "1:315863450054:web:9accc8bdf57fda00c6f2c7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ══════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════

// APK sanitizes email: replace [.#$[\]] with _
function sanitizeEmail(email) {
    return email.replace(/[.#$\[\]]/g, '_');
}

function timeAgo(ms) {
    if (!ms) return 'Never';
    const diff = Date.now() - ms;
    const s = Math.floor(diff / 1000);
    if (s < 5)  return 'Just now';
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return new Date(ms).toLocaleDateString();
}

function batteryColor(pct) {
    if (pct > 50) return 'var(--success)';
    if (pct > 20) return 'var(--warning)';
    return 'var(--error)';
}

function batteryIcon(pct) {
    if (pct > 70) return '🔋';
    if (pct > 30) return '🪫';
    return '🔴';
}

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
let currentUser   = null;
let devicesRef    = null;
let map           = null;
let markers       = {};
let devices       = {};
let isLoginMode   = true;
let selectedId    = null;

// ══════════════════════════════════════════
// DOM
// ══════════════════════════════════════════
const authScreen     = document.getElementById('auth-screen');
const dashScreen     = document.getElementById('dashboard-screen');
const emailInput     = document.getElementById('email');
const passwordInput  = document.getElementById('password');
const authBtn        = document.getElementById('auth-btn');
const toggleBtn      = document.getElementById('toggle-btn');
const authModeText   = document.getElementById('auth-mode');
const logoutBtn      = document.getElementById('logout-btn');
const devicesList    = document.getElementById('devices-list');
const deviceCount    = document.getElementById('device-count');
const userEmailEl    = document.getElementById('user-email');
const headerStatus   = document.getElementById('header-status');
const notifContainer = document.getElementById('notifications');

// ══════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════
function notify(msg, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'notification ' + type;
    el.textContent = msg;
    notifContainer.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
toggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authBtn.textContent      = isLoginMode ? 'Sign In' : 'Create Account';
    authModeText.textContent = isLoginMode ? "Don't have an account?" : 'Already have an account?';
    toggleBtn.textContent    = isLoginMode ? 'Sign Up' : 'Sign In';
});

authBtn.addEventListener('click', async () => {
    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { notify('Enter email and password', 'error'); return; }

    authBtn.disabled = true;
    authBtn.textContent = '...';
    try {
        if (isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            notify('Account created! Welcome 🎉', 'success');
        }
    } catch (e) {
        const msgs = {
            'auth/user-not-found':        'User not found. Try Sign Up.',
            'auth/wrong-password':        'Wrong password.',
            'auth/email-already-in-use':  'Email already used. Sign In instead.',
            'auth/weak-password':         'Password must be at least 6 characters.',
            'auth/invalid-email':         'Invalid email format.',
            'auth/invalid-credential':    'Invalid email or password.',
        };
        notify(msgs[e.code] || e.message, 'error');
        authBtn.disabled = false;
        authBtn.textContent = isLoginMode ? 'Sign In' : 'Create Account';
    }
});

[emailInput, passwordInput].forEach(function(el) {
    el.addEventListener('keydown', function(e) { if (e.key === 'Enter') authBtn.click(); });
});

logoutBtn.addEventListener('click', async () => {
    stopTracking();
    await signOut(auth);
});

onAuthStateChanged(auth, function(user) {
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

// ══════════════════════════════════════════
// SCREENS
// ══════════════════════════════════════════
function showAuth() {
    authScreen.classList.add('active');
    dashScreen.classList.remove('active');
    passwordInput.value = '';
}

function showDashboard() {
    authScreen.classList.remove('active');
    dashScreen.classList.add('active');
    if (userEmailEl) userEmailEl.textContent = currentUser.email;
    initMap();
}

// ══════════════════════════════════════════
// MAP
// ══════════════════════════════════════════
function initMap() {
    if (map) return;
    map = L.map('map', { zoomControl: false, attributionControl: false })
           .setView([55.7558, 37.6173], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

function makeIcon(status) {
    const color = status === 'online' ? '#30D158' : '#8E8E93';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">'
        + '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26S32 28 32 16C32 7.163 24.837 0 16 0z" fill="' + color + '" opacity="0.9"/>'
        + '<circle cx="16" cy="16" r="8" fill="white" opacity="0.95"/>'
        + '</svg>';
    return L.divIcon({ html: svg, iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -44], className: '' });
}

function updateMarker(deviceId, dev) {
    // Support both structures:
    // APK v1 (DataSender.kt): dev.location.lat / dev.location.lng, dev.timestamp
    // APK v2 (spec):          dev.lat / dev.lng, dev.lastSeen
    const lat    = (dev.location && dev.location.lat)  !== undefined ? dev.location.lat  : dev.lat;
    const lng    = (dev.location && dev.location.lng)  !== undefined ? dev.location.lng  : dev.lng;
    const acc    = (dev.location && dev.location.accuracy) || dev.accuracy;
    const ts     = dev.timestamp || dev.lastSeen;
    const status = dev.status || 'offline';
    const bat    = dev.battery;

    if (!lat || !lng) return;

    const popup = '<div style="font-family:-apple-system,sans-serif;min-width:160px">'
        + '<div style="font-weight:700;font-size:15px;margin-bottom:6px">' + deviceId + '</div>'
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
        + '<span style="width:8px;height:8px;border-radius:50%;background:' + (status === 'online' ? '#30D158' : '#8E8E93') + ';display:inline-block"></span>'
        + '<span style="font-size:13px;opacity:.8">' + status + '</span></div>'
        + (bat !== undefined ? '<div style="font-size:13px;opacity:.8">🔋 ' + bat + '%</div>' : '')
        + (acc ? '<div style="font-size:13px;opacity:.7">🎯 ±' + Math.round(acc) + 'm</div>' : '')
        + '<div style="font-size:12px;opacity:.5;margin-top:6px">' + timeAgo(ts) + '</div>'
        + '</div>';

    if (markers[deviceId]) {
        markers[deviceId].setLatLng([lat, lng]);
        markers[deviceId].setIcon(makeIcon(status));
        markers[deviceId].getPopup().setContent(popup);
    } else {
        markers[deviceId] = L.marker([lat, lng], { icon: makeIcon(status) })
            .addTo(map)
            .bindPopup(popup, { maxWidth: 220 });
    }
}

function removeMarker(deviceId) {
    if (markers[deviceId]) { markers[deviceId].remove(); delete markers[deviceId]; }
}

// ══════════════════════════════════════════
// REAL-TIME TRACKING
// Reads from: users/{sanitizedEmail}/devices
// This is exactly where DataSender.kt writes!
// ══════════════════════════════════════════
function startTracking() {
    if (!currentUser) return;

    const emailKey = sanitizeEmail(currentUser.email);
    devicesRef = ref(db, 'users/' + emailKey + '/devices');

    onValue(devicesRef, function(snapshot) {
        const data = snapshot.val();
        devices = data || {};

        // Remove markers for gone devices
        Object.keys(markers).forEach(function(id) {
            if (!devices[id]) removeMarker(id);
        });

        // Update all markers
        Object.entries(devices).forEach(function(entry) {
            updateMarker(entry[0], entry[1]);
        });

        renderPanel();
        updateHeaderStatus();
    }, function(err) {
        notify('Connection error: ' + err.message, 'error');
        console.error('Firebase error:', err);
    });
}

function stopTracking() {
    if (devicesRef) { off(devicesRef); devicesRef = null; }
    devices = {};
    if (map) { Object.values(markers).forEach(function(m) { m.remove(); }); markers = {}; }
    renderPanel();
}

// ══════════════════════════════════════════
// RENDER PANEL
// ══════════════════════════════════════════
function renderPanel() {
    const entries = Object.entries(devices);
    if (deviceCount) deviceCount.textContent = entries.length;

    if (entries.length === 0) {
        devicesList.innerHTML =
            '<div class="empty-state">'
            + '<div style="font-size:48px;margin-bottom:16px">📡</div>'
            + '<div style="font-size:15px;opacity:.6">No devices found</div>'
            + '<div style="font-size:13px;opacity:.4;margin-top:8px">Open PhoneTracker app<br>and enter <b>' + (currentUser ? currentUser.email : '') + '</b></div>'
            + '</div>';
        return;
    }

    devicesList.innerHTML = entries.map(function(entry) {
        const id  = entry[0];
        const dev = entry[1];
        const lat    = (dev.location && dev.location.lat) || dev.lat;
        const lng    = (dev.location && dev.location.lng) || dev.lng;
        const ts     = dev.timestamp || dev.lastSeen;
        const status = dev.status || 'offline';
        const bat    = dev.battery;
        const isOn   = status === 'online' && ts && (Date.now() - ts < 90000);

        return '<div class="device-card' + (selectedId === id ? ' active' : '') + '" onclick="window.focusDevice(\'' + id + '\')">'
            + '<div class="device-icon">📱</div>'
            + '<div class="device-info">'
            + '<div class="device-name">' + id + '</div>'
            + '<div class="device-status' + (isOn ? '' : ' offline') + '">'
            + (isOn ? 'Online' : 'Offline') + ' · ' + timeAgo(ts)
            + '</div></div>'
            + '<div class="device-meta">'
            + (bat !== undefined && bat !== null
                ? '<div class="device-battery" style="color:' + batteryColor(bat) + '">' + batteryIcon(bat) + ' ' + bat + '%</div>'
                : '')
            + (lat
                ? '<div class="device-coords">' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '</div>'
                : '<div class="device-coords">No GPS yet</div>')
            + '</div></div>';
    }).join('');
}

function updateHeaderStatus() {
    const total   = Object.keys(devices).length;
    const online  = Object.values(devices).filter(function(d) {
        const ts = d.timestamp || d.lastSeen || 0;
        return d.status === 'online' && (Date.now() - ts < 90000);
    }).length;

    const dot = document.querySelector('.status-dot');
    if (dot) dot.className = 'status-dot ' + (online > 0 ? 'online' : 'offline');
    if (headerStatus) {
        headerStatus.textContent = total === 0 ? 'No devices' : online + '/' + total + ' online';
    }
}

// ══════════════════════════════════════════
// GLOBAL ACTIONS
// ══════════════════════════════════════════
window.focusDevice = function(id) {
    selectedId = id;
    const dev = devices[id];
    if (!dev) return;
    const lat = (dev.location && dev.location.lat) || dev.lat;
    const lng = (dev.location && dev.location.lng) || dev.lng;
    if (lat && map) {
        map.flyTo([lat, lng], 16, { duration: 1.2 });
        setTimeout(function() { if (markers[id]) markers[id].openPopup(); }, 1300);
    }
    renderPanel();
};

window.fitAllDevices = function() {
    const coords = Object.values(devices)
        .map(function(d) { return [(d.location && d.location.lat) || d.lat, (d.location && d.location.lng) || d.lng]; })
        .filter(function(c) { return c[0] && c[1]; });
    if (!coords.length || !map) return;
    if (coords.length === 1) { map.flyTo(coords[0], 15); return; }
    map.flyToBounds(L.latLngBounds(coords), { padding: [40, 40] });
};
