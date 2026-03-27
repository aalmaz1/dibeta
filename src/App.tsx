import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, Battery, Lock, Camera, 
  Play, Pause, Plus, LogOut, 
  Signal, Shield 
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  accuracy: number;
  battery: number;
  status: 'online' | 'offline';
  lastSeen: Date;
  platform: string;
  wifi: string[];
  type: 'laptop' | 'phone';
}

const HwaseongDemo = {
  home: { lat: 37.203456, lng: 127.045678 },
  uni: { lat: 37.205123, lng: 127.047890 },
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('user@hyprtrack.io');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "asus-ubuntu-uuid-001",
      name: "Asus Laptop • KUbuntu",
      lat: HwaseongDemo.home.lat,
      lng: HwaseongDemo.home.lng,
      accuracy: 5,
      battery: 78,
      status: "online",
      lastSeen: new Date(),
      platform: "Linux",
      wifi: ["HomeWiFi-5G", "UniGuest"],
      type: "laptop"
    },
    {
      id: "samsung-galaxy-uuid-002",
      name: "Samsung Galaxy S24 Ultra",
      lat: HwaseongDemo.uni.lat,
      lng: HwaseongDemo.uni.lng,
      accuracy: 8,
      battery: 92,
      status: "online",
      lastSeen: new Date(Date.now() - 1000 * 32),
      platform: "Android",
      wifi: ["HomeWiFi-5G"],
      type: "phone"
    }
  ]);

  const [selectedDevice, setSelectedDevice] = useState<Device>(devices[0]);
  const [isTracking, setIsTracking] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [perf, setPerf] = useState({ fps: 60, latency: 42, memory: 27 });
  const mapRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  // Simulate real-time updates (Firebase listener simulation)
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => prev.map(device => {
        if (device.status === 'online') {
          const drift = (Math.random() - 0.5) * 0.0008;
          return {
            ...device,
            lat: device.lat + drift,
            lng: device.lng + drift * 0.7,
            battery: Math.max(5, Math.min(100, device.battery - (Math.random() > 0.93 ? 1 : 0))),
            lastSeen: new Date()
          };
        }
        return device;
      }));
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Performance monitor
  useEffect(() => {
    let frameCount = 0;
    let lastTime = Date.now();

    const measurePerf = () => {
      frameCount++;
      const now = Date.now();
      
      if (now - lastTime > 1000) {
        setPerf(prev => ({
          ...prev,
          fps: Math.floor(frameCount * 1000 / (now - lastTime)),
          latency: Math.floor(Math.random() * 18) + 28,
          memory: Math.floor(18 + Math.random() * 15)
        }));
        frameCount = 0;
        lastTime = now;
      }
      animationRef.current = requestAnimationFrame(measurePerf);
    };

    animationRef.current = requestAnimationFrame(measurePerf);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const handleLogin = () => {
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoggingIn(false);
    }, 680);
  };

  const triggerCommand = (command: string, deviceId: string) => {
    const notif = document.createElement('div');
    notif.className = 'fixed bottom-6 right-6 bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50';
    notif.innerHTML = `✅ Команда <strong>${command}</strong> отправлена на ${devices.find(d => d.id === deviceId)?.name}`;
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      notif.style.opacity = '0';
      notif.style.transform = 'translateY(20px)';
      setTimeout(() => document.body.removeChild(notif), 400);
    }, 2200);
  };

  const selected = devices.find(d => d.id === selectedDevice.id) || devices[0];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(at_center,#007AFF10_0%,transparent_70%)]"></div>
        
        <div className="w-full max-w-md px-6 relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-3xl flex items-center justify-center shadow-xl">
                <Shield className="w-9 h-9 text-white" />
              </div>
              <div>
                <h1 className="text-5xl font-semibold tracking-tighter text-white">hyprtrack</h1>
                <p className="text-blue-400 text-sm tracking-[3px] mt-1">VISION OS • 2026</p>
              </div>
            </div>
            <p className="text-white/60 text-lg">Precision Tracking System</p>
          </div>

          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            <h2 className="text-2xl font-medium text-white mb-8 text-center">Войти в аккаунт</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-2">Email</label>
                <input 
                  type="email" 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="user@hyprtrack.io"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-white/50 block mb-2">Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/10 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="w-full bg-[#007AFF] hover:bg-blue-600 active:bg-blue-700 transition-all py-4 rounded-2xl text-lg font-medium text-white shadow-inner flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isLoggingIn ? "CONNECTING TO FIREBASE..." : "ВОЙТИ В СИСТЕМУ"}
              </button>
            </div>

            <div className="text-center mt-8 text-xs text-white/40">
              Firebase Auth • End-to-End Encrypted
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* iOS-style Status Bar */}
      <div className="h-12 bg-black/90 backdrop-blur-xl border-b border-white/10 flex items-center px-6 z-50 relative">
        <div className="flex-1 flex items-center gap-2">
          <div className="text-blue-400 font-medium tracking-widest text-sm">HYPRTRACK</div>
          <div className="px-2.5 py-px text-[10px] font-mono bg-white/10 rounded">V2.1</div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-1.5">
            <Signal className="w-4 h-4" />
            <span>5G</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <Battery className="w-4 h-4" />
            <span>94%</span>
          </div>
          <div className="text-xs text-white/60 font-mono">14:28</div>
          <button onClick={() => setIsAuthenticated(false)} className="text-white/40 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-48px)]">
        {/* Sidebar - Devices */}
        <div className="w-80 bg-zinc-950 border-r border-white/10 flex flex-col">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="uppercase text-xs tracking-[1px] text-white/50 font-medium">Devices • 2 ONLINE</div>
              <button 
                onClick={() => setShowAddDevice(true)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-3 custom-scroll">
            {devices.map(device => (
              <div 
                key={device.id}
                onClick={() => setSelectedDevice(device)}
                className={`device-card p-4 rounded-3xl cursor-pointer transition-all duration-200 border ${selectedDevice.id === device.id ? 'border-[#007AFF] bg-white/10 shadow-2xl' : 'border-white/10 hover:border-white/30'}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-lg leading-none">{device.name}</div>
                    <div className="text-xs text-white/50 mt-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                      {device.platform}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs font-mono text-white/40">ACC {device.accuracy}m</div>
                    <div className="flex items-center gap-1 text-emerald-400 text-sm mt-1">
                      <Battery className="w-3.5 h-3.5" />
                      {device.battery}%
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 text-[10px] font-mono text-white/30 flex gap-2">
                  {device.wifi.slice(0, 2).map((w, i) => (
                    <div key={i} className="bg-white/5 px-2 py-px rounded">📡 {w}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Performance Panel */}
          <div className="p-5 border-t border-white/10 bg-black/60">
            <div className="text-xs uppercase tracking-widest mb-3 text-white/40">SYSTEM STATUS</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-emerald-400 text-xl font-mono">{perf.fps}</div>
                <div className="text-[10px] text-white/40">FPS</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-amber-400 text-xl font-mono">{perf.latency}</div>
                <div className="text-[10px] text-white/40">MS</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-3">
                <div className="text-sky-400 text-xl font-mono">{perf.memory}</div>
                <div className="text-[10px] text-white/40">MB</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <MapContainer
            center={[37.2043, 127.0468]}
            zoom={15.8}
            className="absolute inset-0 z-0"
            ref={mapRef}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
              className="grayscale-[0.6] contrast-[1.15]"
            />
            
            {devices.map(device => (
              <Marker 
                key={device.id}
                position={[device.lat, device.lng]}
                eventHandlers={{
                  click: () => setSelectedDevice(device)
                }}
              >
                <Popup className="glass-popup">
                  <div className="text-sm">
                    <strong>{device.name}</strong><br />
                    ±{device.accuracy}m • {device.battery}% battery
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Glass Overlay Info Card */}
          <div className="absolute top-6 right-6 w-80 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-3xl p-6 shadow-2xl z-20">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-semibold text-lg tracking-tight">{selected.name}</div>
                <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                  ● LIVE • {format(selected.lastSeen, 'HH:mm:ss')}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4">
                <div className="text-sm">GPS Accuracy</div>
                <div className="font-mono text-xl font-semibold text-emerald-400">±{selected.accuracy}<span className="text-xs align-super ml-0.5">m</span></div>
              </div>

              <div className="flex justify-between items-center bg-white/5 rounded-2xl p-4">
                <div className="text-sm">Battery</div>
                <div className="flex items-center gap-2">
                  <Battery className="w-5 h-5 text-emerald-400" />
                  <span className="font-mono text-3xl font-light">{selected.battery}</span>
                  <span className="text-xs text-white/40">%</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  onClick={() => triggerCommand('LOCK', selected.id)}
                  className="flex-1 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.985] transition-all border border-white/10"
                >
                  <Lock className="w-4 h-4" /> LOCK
                </button>
                
                <button 
                  onClick={() => triggerCommand('SCREENSHOT', selected.id)}
                  className="flex-1 bg-white/10 hover:bg-white/20 py-4 rounded-2xl text-sm flex items-center justify-center gap-2 active:scale-[0.985] transition-all border border-white/10"
                >
                  <Camera className="w-4 h-4" /> CAPTURE
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 px-8 py-3 rounded-3xl flex items-center gap-8 text-sm z-30 shadow-2xl">
            <div 
              onClick={() => setIsTracking(!isTracking)}
              className={`flex items-center gap-2 px-5 py-2 rounded-3xl cursor-pointer transition-all ${isTracking ? 'bg-emerald-500/90 text-black' : 'bg-white/10'}`}
            >
              {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span className="font-medium text-xs tracking-widest">{isTracking ? 'TRACKING' : 'PAUSED'}</span>
            </div>

            <div className="h-5 w-px bg-white/10" />

            <div className="flex items-center gap-6 text-xs font-mono text-white/50">
              <div>LAT {selected.lat.toFixed(5)}</div>
              <div>LNG {selected.lng.toFixed(5)}</div>
              <div className="text-emerald-400">HWASEONG-SI, KR</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-md p-8">
            <h3 className="text-2xl mb-6">Add New Device</h3>
            
            <input
              type="text"
              value={newDeviceId}
              onChange={(e) => setNewDeviceId(e.target.value)}
              placeholder="Device ID (e.g. dell-xps-3921)"
              className="w-full bg-black border border-white/20 rounded-2xl px-6 py-5 text-white placeholder:text-white/30 mb-8 focus:outline focus:outline-1 focus:outline-blue-500"
            />
            
            <div className="flex gap-4">
              <button 
                onClick={() => setShowAddDevice(false)}
                className="flex-1 py-4 text-sm border border-white/20 rounded-2xl"
              >
                CANCEL
              </button>
              <button 
                onClick={() => {
                  if (newDeviceId.trim()) {
                    const newDev: Device = {
                      id: newDeviceId,
                      name: newDeviceId.split('-').slice(0, 2).join(' '),
                      lat: 37.209 + Math.random() * 0.01,
                      lng: 127.041 + Math.random() * 0.01,
                      accuracy: 11,
                      battery: 64,
                      status: "online",
                      lastSeen: new Date(),
                      platform: "Windows",
                      wifi: ["OfficeWiFi"],
                      type: "laptop"
                    };
                    setDevices([...devices, newDev]);
                    setShowAddDevice(false);
                    setNewDeviceId('');
                  }
                }}
                className="flex-1 py-4 bg-blue-600 rounded-2xl text-sm font-medium"
              >
                ADD DEVICE
              </button>
            </div>
            
            <div className="text-center text-xs text-white/30 mt-8">Firebase Realtime Database Sync</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
