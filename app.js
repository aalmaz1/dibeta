// ==========================================
// Firebase SDK Imports
// ==========================================
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

// ==========================================
// Firebase Config - ЗАМЕНИТЕ НА СВОИ ЗНАЧЕНИЯ
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

console.log('Firebase initialized:', app);

// ==========================================
// State
// ==========================================
let isLoginMode = true;
let currentUser = null;
let devicesRef = null;
let map = null;
let markers = {};

// ==========================================
// DOM Elements
// ==========================================
const els = {
    authScreen: document.getElementById('auth-screen'),
    dashboardScreen: document.getElementById('dashboard-screen'),
    email: document.getElementById('email'),
    password: document.getElementById('password'),
    authActionBtn: document.getElementById('auth-action-btn'),
    btnText: document.getElementById('btn-text'),
    btnLoader: document.getElementById('btn-loader'),
    authToggleBtn: document.getElementById('auth-toggle-btn'),
    authModeText: document.getElementById('auth-mode-text'),
    logoutBtn: document.getElementById('logout-btn'),
    deviceList: document.getElementById('device-list'),
    deviceCount: document.getElementById('device-count'),
    userEmail: document.getElementById('user-email'),
    notifications: document.getElementById('notifications')
};

console.log('DOM elements:', els);

// ==========================================
// Auth Functions
// ==========================================

function toggleAuthMode() {
    console.log('Toggle clicked, current mode:', isLoginMode);
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        els.btnText.textContent = 'Sign In';
        els.authModeText.textContent = "Don't have an account?";
        els.authToggleBtn.textContent = 'Sign Up';
    } else {
        els.btnText.textContent = 'Create Account';
        els.authModeText.textContent = "Already have an account?";
        els.authToggleBtn.textContent = 'Sign In';
    }
    
    console.log('New mode:', isLoginMode ? 'login' : 'signup');
}

async function handleAuthAction() {
    const email = els.email.value.trim();
    const password = els.password.value;
    
    console.log('Auth action:', isLoginMode ? 'login' : 'signup', email);
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
    }
    
    setLoading(true);
    
    try {
        if (isLoginMode) {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Signed in:', userCredential.user.email);
            showNotification('Signed in successfully!', 'success');
        } else {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Account created:', userCredential.user.email);
            showNotification('Account created successfully!', 'success');
        }
    } catch (error) {
        console.error('Auth error:', error);
        showNotification(getErrorMessage(error.code), 'error');
    } finally {
        setLoading(false);
    }
}

function handleLogout() {
    signOut(auth).then(() => {
        showNotification('Signed out', 'success');
    }).catch((error) => {
        showNotification('Error: ' + error.message, 'error');
    });
}

// ==========================================
// Event Listeners
// ==========================================

// Кнопка Sign Up / Sign In переключения
els.authToggleBtn.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log('Toggle button clicked!');
    toggleAuthMode();
});

// Кнопка основного действия (Sign In / Create Account)
els.authActionBtn.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('Action button clicked!');
    handleAuthAction();
});

// Кнопка выхода
els.logoutBtn.addEventListener('click', handleLogout);

// ==========================================
// Auth State
// ==========================================

onAuthStateChanged(auth, (user) => {
    console.log('Auth state changed:', user ? user.email : 'null');
    
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

// ==========================================
// UI Functions
// ==========================================

function setLoading(loading) {
    els.authActionBtn.disabled = loading;
    els.btnText.classList.toggle('hidden', loading);
    els.btnLoader.classList.toggle('hidden', !loading);
}

function showAuth() {
    els.authScreen.classList.add('active');
    els.dashboardScreen.classList.remove('active');
    els.email.value = '';
    els.password.value = '';
    isLoginMode = true;
    els.btnText.textContent = 'Sign In';
    els.authModeText.textContent = "Don't have an account?";
    els.authToggleBtn.textContent = 'Sign Up';
}

function showDashboard() {
    els.authScreen.classList.remove('active');
    els.dashboardScreen.classList.add('active');
    els.userEmail.textContent = currentUser.email;
    initMap();
}

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    notif.style.cssText = `
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        margin-bottom: 10px;
        border-left: 4px solid ${type === 'success' ? '#30D158' : type === 'error' ? '#FF3B30' : '#007AFF'};
        animation: slideIn 0.3s ease;
    `;
    els.notifications.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

function getErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'Account disabled',
        'auth/user-not-found': 'Account not found',
        'auth/wrong-password': 'Wrong password',
        'auth/email-already-in-use': 'Email already registered',
        'auth/weak-password': 'Password too weak (min 6 chars)',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/network-request-failed': 'Network error'
    };
    return messages[code] || code;
}

// ==========================================
// Map Functions
// ==========================================

function initMap() {
    if (map) return;
    
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([37.5665, 126.9780], 12);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    
    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// ==========================================
// Tracking Functions
// ==========================================

function startTracking() {
    if (!currentUser) return;
    
    const userId = currentUser.email.replace(/[.#$[\]]/g, '_');
    devicesRef = ref(database, `users/${userId}/devices`);
    
    onValue(devicesRef, (snapshot) => {
        const data = snapshot.val() || {};
        renderDevices(data);
    });
}

function stopTracking() {
    if (devicesRef) {
        off(devicesRef);
        devicesRef = null;
    }
    
    Object.values(markers).forEach(m => map?.removeLayer(m));
    markers = {};
}

function renderDevices(devices) {
    const entries = Object.entries(devices);
    els.deviceCount.textContent = entries.length;
    
    if (entries.length === 0) {
        els.deviceList.innerHTML = '<div class="empty-state">No devices found</div>';
        return;
    }
    
    els.deviceList.innerHTML = entries.map(([id, dev]) => {
        const loc = dev.location || {};
        const online = dev.timestamp && (Date.now() - dev.timestamp < 300000);
        
        return `
            <div class="device-card" data-id="${id}">
                <div class="device-icon">📱</div>
                <div class="device-info">
                    <div class="device-name">${dev.name || id}</div>
                    <div class="device-status ${online ? '' : 'offline'}">
                        ${online ? 'Online' : 'Offline'}
                    </div>
                </div>
                <div class="device-meta">
                    <div class="device-battery">${dev.battery || '?'}%</div>
                    <div class="device-coords">
                        ${loc.lat?.toFixed(4) || '?'}, ${loc.lng?.toFixed(4) || '?'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Click handlers
    els.deviceList.querySelectorAll('.device-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = card.dataset.id;
            const dev = devices[id];
            if (dev?.location?.lat && map) {
                map.flyTo([dev.location.lat, dev.location.lng], 16);
            }
        });
    });
}

// ==========================================
// Service Worker
// ==========================================

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('SW registered'))
        .catch(err => console.log('SW error:', err));
}

console.log('App initialized successfully!');
