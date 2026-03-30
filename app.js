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
// CONFIG - ВАШИ ЗНАЧЕНИЯ
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
let deviceListeners = {}; // Слушатели для каждого устройства

// ==========================================
// DOM ELEMENTS
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
// AUTH LOGIC
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
// MAP LOGIC
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
    const { lat, lng, battery, status } = device || {};
    if (!lat || !lng) return;
    
    const pos = [lat, lng];
    const iconColor = status === 'online' ? 'green' : 'gray';
    
    if (markers[deviceId]) {
        markers[deviceId].setLatLng(pos);
        markers[deviceId].getPopup().setContent(`<b>${deviceId}</b><br>Battery: ${battery}%<br>Status: ${status}`);
    } else {
        markers[deviceId] = L.marker(pos).addTo(map)
            .bindPopup(`<b>${deviceId}</b><br>Battery: ${battery}%<br>Status: ${status}`);
    }
}

// ==========================================
// DEVICES TRACKING (СВЯЗКА С ТЕЛЕФОНОМ)
// ==========================================

function startTracking() {
    if (!currentUser) return;
    
    // 1. Получаем список ID из профиля пользователя
    const userDevicesRef = ref(database, `users/${currentUser.uid}/devices`);
    
    onValue(userDevicesRef, (snapshot) => {
        const userDeviceList = snapshot.val() || {};
        
        // Для каждого ID запускаем отдельное «живое» отслеживание
        Object.keys(userDeviceList).forEach(deviceId => {
            if (!deviceListeners[deviceId]) {
                
                // Слушаем ветку, куда пишет APK на телефоне
                const liveRef = ref(database, `devices/${deviceId}`);
                
                deviceListeners[deviceId] = onValue(liveRef, (liveSnapshot) => {
                    const liveData = liveSnapshot.val();
                    if (liveData) {
                        // Объединяем данные регистрации и живые координаты
                        devices[deviceId] = {
                            ...userDeviceList[deviceId],
                            ...liveData
                        };
                        renderDevices();
                        updateMarker(deviceId, devices[deviceId]);
                    }
                });
            }
        });
    });
}

function stopTracking() {
    // Отписываемся от всех обновлений
    Object.values(deviceListeners).forEach(unsubscribe => unsubscribe());
    deviceListeners = {};
    devices = {};
    if (map) {
        Object.values(markers).forEach(m => m.remove());
        markers = {};
    }
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
        // Логика онлайна: статус 'online' + обновление не позднее 1 минуты назад
        const isOnline = dev.status === 'online' && (Date.now() - (dev.lastSeen || 0) < 60000);
        const time = dev.lastSeen ? new Date(dev.lastSeen).toLocaleTimeString() : 'Never';
        
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
// MODAL & DEVICE GENERATION
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
    const inputVal = deviceIdInput.value.trim();
    if (!inputVal) {
        alert('Please enter a name or number');
        return;
    }
    
    // Чистим ID от запрещенных символов Firebase
    const deviceId = inputVal.replace(/[.#$[\]]/g, '_');
    
    generatedIdDisplay.textContent = deviceId;
    qrSection.classList.remove('hidden');
    
    // Генерируем QR
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: deviceId,
        width: 200,
        height: 200
    });
    
    // Привязываем ID к текущему пользователю
    if (currentUser) {
        const userDeviceRef = ref(database, `users/${currentUser.uid}/devices/${deviceId}`);
        set(userDeviceRef, {
            addedAt: Date.now(),
            label: inputVal
        });
    }
};

window.copyDeviceId = () => {
    navigator.clipboard.writeText(generatedIdDisplay.textContent)
        .then(() => alert('Device ID copied!'))
        .catch(() => alert('Failed to copy'));
};

addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal();
});
