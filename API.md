# 🔌 API Reference

## 📡 Доступные Web APIs

### 1. Geolocation API

**Описание:** Определение местоположения устройства

```javascript
// Получить текущие координаты
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    console.log(`Lat: ${latitude}, Lng: ${longitude}`);
    console.log(`Accuracy: ${accuracy}m`);
  },
  (error) => {
    console.error('GPS Error:', error.message);
  },
  {
    enableHighAccuracy: true,  // Высокая точность
    timeout: 10000,            // 10 секунд таймаут
    maximumAge: 0              // Не использовать кэш
  }
);

// Отслеживать изменения местоположения
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    // Вызывается при каждом изменении
  },
  (error) => {
    // Обработка ошибок
  },
  {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 1000           // Обновлять каждую секунду
  }
);

// Остановить отслеживание
navigator.geolocation.clearWatch(watchId);
```

**Ошибки:**
- `PERMISSION_DENIED` (1) - пользователь отказал
- `POSITION_UNAVAILABLE` (2) - GPS недоступен
- `TIMEOUT` (3) - время ожидания истекло

**Поддержка:** Chrome, Firefox, Safari, Edge, Mobile

---

### 2. Battery Status API

**Описание:** Информация о заряде батареи

```javascript
// Получить состояние батареи
const battery = await navigator.getBattery();

// Основные свойства
console.log(battery.level);        // 0.85 (85%)
console.log(battery.charging);     // true/false

// Время до полного заряда/разряда
console.log(battery.chargingTime); // Infinity (если не заряжается)
console.log(battery.dischargingTime); // Infinity (если заряжается)

// Слушатели событий
battery.addEventListener('levelchange', () => {
  console.log('Level:', battery.level);
});

battery.addEventListener('chargingchange', () => {
  console.log('Charging:', battery.charging);
});

battery.addEventListener('chargingtimechange', () => {
  console.log('Charging time:', battery.chargingTime);
});

battery.addEventListener('dischargingtimechange', () => {
  console.log('Discharging time:', battery.dischargingTime);
});
```

**Поддержка:** Chrome, Edge, Opera (Firefox ограничен, Safari не поддерживает)

**Fallback для Safari:**
```javascript
if (!('getBattery' in navigator)) {
  // Fallback: показать заглушку
  document.getElementById('batteryLevel').textContent = 'N/A';
}
```

---

### 3. Canvas API

**Описание:** Отрисовка графики на холсте

```javascript
// Получить контекст
const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');

// Настройка размера
const dpr = window.devicePixelRatio || 1;
canvas.width = canvas.clientWidth * dpr;
canvas.height = canvas.clientHeight * dpr;
ctx.scale(dpr, dpr);

// Отрисовка точки
ctx.fillStyle = '#00ff88';
ctx.beginPath();
ctx.arc(x, y, 8, 0, Math.PI * 2);
ctx.fill();

// Отрисовка круга с градиентом
const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
gradient.addColorStop(0, 'rgba(0, 255, 136, 0.4)');
gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(x, y, 50, 0, Math.PI * 2);
ctx.fill();

// Отрисовка текста
ctx.fillStyle = '#ffffff';
ctx.font = '12px Segoe UI, sans-serif';
ctx.textAlign = 'center';
ctx.fillText('Метка', x, y - 25);

// Очистка холста
ctx.clearRect(0, 0, canvas.width, canvas.height);
```

**Производительность:**
- 60fps при простой отрисовке
- Оптимизировано для карт
- Нет VirtualDOM overhead

---

### 4. LocalStorage API

**Описание:** Хранение данных в браузере

```javascript
// Сохранить данные
const data = { lat: 37.2597, lng: 126.8309, time: Date.now() };
localStorage.setItem('tracker_location', JSON.stringify(data));

// Получить данные
const saved = localStorage.getItem('tracker_location');
const location = saved ? JSON.parse(saved) : null;

// Удалить данные
localStorage.removeItem('tracker_location');

// Очистить всё
localStorage.clear();

// Слушатель изменений (в других вкладках)
window.addEventListener('storage', (e) => {
  if (e.key === 'tracker_location') {
    const newData = JSON.parse(e.newValue);
    console.log('Updated:', newData);
  }
});
```

**Лимиты:**
- 5MB на домен
- Синхронное API (не блокирует UI)
- Только строки (JSON для объектов)

---

### 5. Service Worker API

**Описание:** Оффлайн работа, кэширование

```javascript
// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('SW registered:', reg))
    .catch(err => console.error('SW failed:', err));
}

// Отправка сообщений в SW
navigator.serviceWorker.ready.then(reg => {
  reg.active.postMessage({ type: 'UPDATE_LOCATION', data: location });
});

// Получение сообщений от SW
navigator.serviceWorker.addEventListener('message', (event) => {
  console.log('Message from SW:', event.data);
});
```

**SW код (sw.js):**
```javascript
const CACHE_NAME = 'tracker-v1';
const urlsToCache = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

---

### 6. Web Share API

**Описание:** Нативное шеринг

```javascript
// Проверка поддержки
if (navigator.share) {
  // Поделиться
  try {
    await navigator.share({
      title: 'Мое местоположение',
      text: 'Координаты: 37.2597, 126.8309',
      url: 'https://maps.google.com/?q=37.2597,126.8309'
    });
    console.log('Shared successfully');
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Share failed:', err);
    }
  }
} else {
  // Fallback: копирование в буфер
  navigator.clipboard.writeText('https://maps.google.com/?q=37.2597,126.8309');
}
```

**Поддержка:** Chrome, Safari, Firefox Mobile (Desktop ограничен)

---

### 7. Clipboard API

**Описание:** Копирование в буфер обмена

```javascript
// Копировать текст
await navigator.clipboard.writeText('Текст для копирования');

// Копировать HTML
const blob = new Blob(['<p>HTML content</p>'], { type: 'text/html' });
await navigator.clipboard.write([
  new ClipboardItem({
    'text/html': blob
  })
]);

// Получить текст (требует разрешения)
const text = await navigator.clipboard.readText();
console.log('Clipboard:', text);
```

---

### 8. Permissions API

**Описание:** Проверка разрешений

```javascript
// Проверить статус GPS
const permission = await navigator.permissions.query({ name: 'geolocation' });
console.log(permission.state); // 'granted' | 'denied' | 'prompt'

// Слушать изменения
permission.addEventListener('change', () => {
  console.log('Permission changed:', permission.state);
});

// Другие разрешения
const camera = await navigator.permissions.query({ name: 'camera' });
const microphone = await navigator.permissions.query({ name: 'microphone' });
const notifications = await navigator.permissions.query({ name: 'notifications' });
```

---

### 9. Network Information API

**Описание:** Информация о сети

```javascript
// Проверка онлайн/оффлайн
if (navigator.onLine) {
  console.log('Online');
} else {
  console.log('Offline');
}

// Слушать изменения
window.addEventListener('online', () => console.log('Online'));
window.addEventListener('offline', () => console.log('Offline'));

// Детали подключения (Chrome только)
if (navigator.connection) {
  console.log('Effective type:', navigator.connection.effectiveType);
  console.log('Downlink:', navigator.connection.downlink, 'Mbps');
  console.log('RTT:', navigator.connection.rtt, 'ms');
  
  navigator.connection.addEventListener('change', () => {
    console.log('Connection changed');
  });
}
```

---

### 10. Page Visibility API

**Описание:** Отслеживание видимости страницы

```javascript
// Проверить видимость
if (document.hidden) {
  console.log('Page is hidden');
} else {
  console.log('Page is visible');
}

// Слушать изменения
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Остановить обновления
    console.log('Page hidden - pause updates');
  } else {
    // Запустить обновления
    console.log('Page visible - resume updates');
  }
});
```

---

## 🎯 Примеры использования

### 1. Полный GPS трекер

```javascript
class GPSTracker {
  constructor() {
    this.locations = [];
    this.init();
  }
  
  async init() {
    // Проверка поддержки
    if (!('geolocation' in navigator)) {
      throw new Error('GPS not supported');
    }
    
    // Получить текущее местоположение
    await this.updateLocation();
    
    // Обновлять каждую минуту
    setInterval(() => this.updateLocation(), 60000);
  }
  
  async updateLocation() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: Date.now()
          };
          
          this.locations.unshift(location);
          this.saveToStorage();
          resolve(location);
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }
  
  saveToStorage() {
    localStorage.setItem('gps_history', JSON.stringify(this.locations.slice(0, 100)));
  }
  
  getHistory() {
    const saved = localStorage.getItem('gps_history');
    return saved ? JSON.parse(saved) : [];
  }
}
```

### 2. Battery Monitor

```javascript
class BatteryMonitor {
  constructor() {
    this.battery = null;
    this.init();
  }
  
  async init() {
    if (!('getBattery' in navigator)) {
      console.warn('Battery API not supported');
      return;
    }
    
    this.battery = await navigator.getBattery();
    this.updateUI();
    
    this.battery.addEventListener('levelchange', () => this.updateUI());
    this.battery.addEventListener('chargingchange', () => this.updateUI());
  }
  
  updateUI() {
    const level = Math.round(this.battery.level * 100);
    const charging = this.battery.charging ? '🔌' : '🔋';
    console.log(`${charging} Battery: ${level}%`);
  }
  
  getLowBatteryAlert(threshold = 20) {
    const level = Math.round(this.battery.level * 100);
    return level <= threshold;
  }
}
```

### 3. Canvas Map Renderer

```javascript
class MapRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.center = { lat: 37.2597, lng: 126.8309 };
    this.zoom = 13;
    this.init();
  }
  
  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.render();
  }
  
  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvas.clientWidth * dpr;
    this.canvas.height = this.canvas.clientHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
  }
  
  render() {
    const { ctx, width, height } = this;
    
    // Очистка
    ctx.fillStyle = '#12121a';
    ctx.fillRect(0, 0, width, height);
    
    // Сетка
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Маркер
    const x = width / 2;
    const y = height / 2;
    
    // Glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
    
    // Точка
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    
    requestAnimationFrame(() => this.render());
  }
}
```

---

## 📊 Performance Tips

### 1. Дебаунс GPS обновлений

```javascript
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const debouncedUpdate = debounce(() => app.getLocation(), 1000);
```

### 2. Ленивая загрузка

```javascript
// IntersectionObserver для lazy load
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadComponent(entry.target);
      observer.unobserve(entry.target);
    }
  });
});

document.querySelectorAll('.lazy').forEach(el => observer.observe(el));
```

### 3. RequestAnimationFrame для анимаций

```javascript
// Правильно
function animate() {
  update();
  render();
  requestAnimationFrame(animate);
}

// Неправильно (setTimeout)
function animate() {
  update();
  render();
  setTimeout(animate, 16); // Нестабильный FPS
}
```

---

## 🔒 Security Best Practices

### 1. HTTPS только

```javascript
if (location.protocol !== 'https:') {
  console.warn('⚠️ Use HTTPS for GPS tracking');
}
```

### 2. Валидация данных

```javascript
function validateLocation(lat, lng) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
```

### 3. Ограничение localStorage

```javascript
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Очистить старые данные
      localStorage.clear();
      localStorage.setItem(key, value);
    }
  }
}
```

---

**API Reference v1.0.0**  
**Last updated: 2026**
