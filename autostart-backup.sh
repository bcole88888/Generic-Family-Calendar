#!/bin/bash

# Backup auto-start script for Family Calendar
# This can be used with crontab @reboot if systemd fails

cd /root/familycalendar

# Wait for network to be ready
sleep 30

# Check if systemd service is running
if systemctl is-active --quiet familycalendar.service; then
    echo "$(date): Systemd service is running, exiting backup script"
    exit 0
fi

# Check if already running on port 3000
if netstat -tuln | grep -q ":3000 "; then
    echo "$(date): Application already running on port 3000"
    exit 0
fi

# Start the application
echo "$(date): Starting Family Calendar via backup method"
cd /root/familycalendar
/usr/bin/node app.js >> /var/log/familycalendar-backup.log 2>&1 &

echo "$(date): Family Calendar started via backup method" >> /var/log/familycalendar-backup.log