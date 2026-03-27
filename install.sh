#!/bin/bash

# HyprTrack KUbuntu Client Installer
# 1-Click Systemd Service

echo "🚀 Installing HyprTrack Client..."

# 1. Install Node.js if missing
if ! command -v node &> /dev/null; then
    sudo apt update && sudo apt install -y nodejs npm
fi

# 2. Create tracking script
cat <<EOF > ~/.hyprtrack-client.js
const http = require('http');
const { exec } = require('child_process');

function track() {
    // Collect data
    exec('upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep percentage', (err, stdout) => {
        const battery = stdout.trim().split(':')[1] || '100%';
        console.log('Tracking update: ' + battery);
        // Here you would fetch GPS via WiFi scan or GPSD and POST to your endpoint
    });
}

setInterval(track, 60000); // Track every 1 min
track();
EOF

# 3. Create Systemd service
cat <<EOF | sudo tee /etc/systemd/system/hyprtrack.service
[Unit]
Description=HyprTrack Background Service
After=network.target

[Service]
ExecStart=/usr/bin/node /home/$USER/.hyprtrack-client.js
Restart=always
User=$USER

[Install]
WantedBy=multi-user.target
EOF

# 4. Start Service
sudo systemctl daemon-reload
sudo systemctl enable hyprtrack
sudo systemctl start hyprtrack

echo "✅ HyprTrack Service Started and Enabled on Boot!"
