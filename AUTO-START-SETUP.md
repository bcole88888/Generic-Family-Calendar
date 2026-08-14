# Auto-Start Setup Guide for Family Calendar

## ✅ Primary Method: Systemd Service (ALREADY CONFIGURED)

Your Family Calendar is already set up to start automatically on boot using systemd. This is the recommended method.

### Service Status Commands:
```bash
# Check if service is running
sudo systemctl status familycalendar.service

# Start the service manually
sudo systemctl start familycalendar.service

# Stop the service
sudo systemctl stop familycalendar.service

# Restart the service
sudo systemctl restart familycalendar.service

# View service logs
sudo journalctl -u familycalendar.service -f

# Disable auto-start (if needed)
sudo systemctl disable familycalendar.service

# Re-enable auto-start
sudo systemctl enable familycalendar.service
```

## 🔄 Backup Method 1: Crontab

If systemd fails, you can use crontab as a backup:

```bash
# Edit crontab
crontab -e

# Add this line to start on boot:
@reboot /root/familycalendar/autostart-backup.sh

# Or add this line to check every 5 minutes if it's running:
*/5 * * * * /root/familycalendar/autostart-backup.sh
```

## 🛠️ Backup Method 2: Manual Script

You can also start manually using the provided script:

```bash
# Run the startup script
/root/familycalendar/start.sh

# Or start directly
cd /root/familycalendar && node app.js
```

## 🔍 Troubleshooting Auto-Start

### Check if Family Calendar is running:
```bash
# Method 1: Check systemd service
sudo systemctl status familycalendar.service

# Method 2: Check if port 3000 is in use
netstat -tuln | grep :3000

# Method 3: Test HTTP response
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Should return: 200
```

### View application logs:
```bash
# Systemd service logs
sudo journalctl -u familycalendar.service -f

# Backup script logs (if using crontab)
tail -f /var/log/familycalendar-backup.log
```

### Common issues:

1. **Port already in use:**
   ```bash
   # Find what's using port 3000
   sudo lsof -i :3000

   # Kill the process if needed
   sudo kill -9 <PID>
   ```

2. **Service fails to start:**
   ```bash
   # Check service logs
   sudo journalctl -u familycalendar.service --no-pager

   # Check if Node.js is installed
   which node

   # Check if application files exist
   ls -la /root/familycalendar/
   ```

3. **Environment variables not loading:**
   ```bash
   # Check .env file exists
   ls -la /root/familycalendar/.env

   # Restart service to reload environment
   sudo systemctl restart familycalendar.service
   ```

## 🌐 Accessing Your Family Calendar

Once running, access your calendar at:
- **Local**: http://localhost:3000
- **Network**: http://[YOUR-SERVER-IP]:3000
- **Domain**: https://familycalendar.example.com (if DNS is configured)

## 🚀 Service Features

Your systemd service includes:
- ✅ **Auto-start on boot**
- ✅ **Auto-restart if crashes**
- ✅ **Security restrictions**
- ✅ **Logging to system journal**
- ✅ **Proper working directory**
- ✅ **Environment variable loading**

## 📋 Status Check Script

You can also create a simple status check:

```bash
# Create a status check script
cat << 'EOF' > /root/familycalendar/check-status.sh
#!/bin/bash
echo "=== Family Calendar Status ==="
echo "Systemd service:"
sudo systemctl is-active familycalendar.service
echo "HTTP response:"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000
echo "Process:"
ps aux | grep "node app.js" | grep -v grep || echo "Not running"
echo "=== End Status ==="
EOF

chmod +x /root/familycalendar/check-status.sh

# Run the status check
/root/familycalendar/check-status.sh
```

Your Family Calendar is now configured to start automatically on every boot! 🎉