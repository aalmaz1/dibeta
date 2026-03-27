# 📱 HyprTrack Android APK Build (Cordova)

HyprTrack can be compiled into a tiny 5MB APK for background tracking.

## Prerequisites
- Node.js
- Cordova: `npm install -g cordova`
- Android SDK

## Build Steps
1. **Create Project:**
   ```bash
   cordova create hyprtrack-android com.hypr.track HyprTrack
   cd hyprtrack-android
   ```

2. **Add Platforms:**
   ```bash
   cordova platform add android
   ```

3. **Add Background Plugins:**
   ```bash
   cordova plugin add cordova-plugin-geolocation
   cordova plugin add cordova-plugin-background-mode
   cordova plugin add cordova-plugin-battery-status
   ```

4. **Copy Dashboard:**
   Replace `www/index.html` with our iOS Glass `index.html`.

5. **Configure `config.xml`:**
   Add these to keep the app alive:
   ```xml
   <preference name="KeepRunning" value="true" />
   <preference name="BackgroundMode" value="true" />
   ```

6. **Build APK:**
   ```bash
   cordova build android --release
   ```

## Why APK over PWA?
- **Foreground Service:** Stay active even if the system tries to kill the app.
- **Boot Start:** Automatically starts tracking when the phone turns on.
- **Persistent GPS:** High-accuracy tracking every 30 seconds.
