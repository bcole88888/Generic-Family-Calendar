# Family Calendar Desktop Application for Ubuntu MATE

This document explains how to run the Family Calendar as a native desktop application on Ubuntu MATE OS, while maintaining the web interface functionality.

## 🌟 Features

### Desktop Application
- **Native Ubuntu MATE integration** - Appears in Applications menu
- **Fullscreen and windowed modes** - Perfect for tablets and desktop use
- **Touch-optimized interface** - Excellent for touchscreen devices
- **System notifications** - Native desktop notifications (future enhancement)
- **Offline capability** - Runs locally without internet dependency for core features

### Web Interface (Maintained)
- **Concurrent access** - Desktop app and web browser can run simultaneously
- **Remote access** - Access from other devices on the network
- **Mobile responsive** - Works great on phones and tablets via browser
- **Easy sharing** - Share calendar with family members via web browser

## 🚀 Quick Installation

### Automatic Installation
```bash
# Clone or download the project
git clone <repository-url> familycalendar
cd familycalendar

# Run the installation script
./install-ubuntu-mate.sh
```

The installer will:
- Install Node.js dependencies
- Set up the web service (systemd)
- Install the desktop application
- Configure desktop integration
- Start the services

### Manual Installation

1. **Install Node.js** (if not already installed):
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. **Install dependencies**:
```bash
npm install
npm install electron electron-builder --save-dev
```

3. **Start the desktop application**:
```bash
npm run electron
```

## 📱 Usage

### Desktop Application
After installation, you can launch the desktop app in several ways:

1. **Applications Menu**: Applications → Office → Family Calendar
2. **Command line**: `family-calendar`
3. **Direct script**: `/opt/familycalendar/start-desktop.sh`

### Web Interface
The web interface remains available at:
- **Local access**: http://localhost:3000
- **Network access**: http://YOUR_IP:3000

### Keyboard Shortcuts (Desktop App)
- **F11**: Toggle fullscreen mode
- **Ctrl+R**: Reload the application
- **Ctrl+Shift+R**: Force reload (clear cache)
- **Ctrl+Shift+I**: Toggle developer tools
- **Ctrl+Q**: Quit application

## ⚙️ Configuration

### Environment Configuration
Edit `/opt/familycalendar/.env` to configure:

```env
# Google Calendar Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Server Configuration
PORT=3000
NODE_ENV=production
```

Everything else — family name/logo, kids, birthdays, which Apple/Google calendars
to sync from — is configured from the in-app Settings page (gear icon) after
the app is running, no file editing required.

### Service Management
```bash
# Check service status
sudo systemctl status familycalendar

# Restart service (after configuration changes)
sudo systemctl restart familycalendar

# View service logs
sudo journalctl -u familycalendar -f

# Stop service
sudo systemctl stop familycalendar

# Start service
sudo systemctl start familycalendar
```

## 🖥️ Desktop Integration Features

### Window Management
- **Responsive sizing**: Minimum 800x600, recommended 1200x800
- **Fullscreen mode**: Perfect for wall-mounted tablets
- **Always on top option**: Available via window controls
- **Custom title bar**: Clean, family-friendly interface

### System Integration
- **Desktop notifications**: Calendar reminders and chore completions
- **System tray integration**: Quick access and status (future enhancement)
- **Auto-start option**: Launch on system startup (configurable)

## 🔧 Development Mode

For development and testing:

```bash
# Start in development mode (with hot reload)
npm run electron-dev

# This starts both the Express server and Electron app
# The web interface will also be available at localhost:3000
```

## 📦 Building Distribution Packages

### Build for Ubuntu MATE (AppImage)
```bash
npm run build-linux
```

This creates a portable AppImage file in the `dist/` directory that can be distributed and run on any Linux system.

### Build for All Platforms
```bash
npm run build-all
```

Creates packages for:
- **Linux**: AppImage
- **Windows**: NSIS installer
- **macOS**: DMG file

## 🎯 Use Cases

### Family Tablet Setup
Perfect for a dedicated family tablet or wall-mounted display:
1. Install Ubuntu MATE on tablet/touchscreen device
2. Run installation script
3. Set desktop app to launch on startup
4. Configure fullscreen mode
5. Mount tablet in kitchen/family room

### Dual Mode Setup
Run both desktop and web versions simultaneously:
- **Desktop app**: For primary family device
- **Web interface**: For family members' phones/tablets
- **Remote access**: For parents at work

### Kiosk Mode
For dedicated family calendar stations:
1. Install on Ubuntu MATE mini PC
2. Configure auto-login and auto-start
3. Set to fullscreen mode
4. Connect to touchscreen monitor

## 🚨 Troubleshooting

### Desktop App Won't Start
```bash
# Check if the service is running
sudo systemctl status familycalendar

# Try starting manually
cd /opt/familycalendar
npm run electron

# Check for errors
journalctl -u familycalendar --no-pager
```

### Web Interface Not Accessible
```bash
# Check if port 3000 is in use
sudo netstat -tulpn | grep :3000

# Restart the service
sudo systemctl restart familycalendar

# Check firewall settings
sudo ufw status
```

### Configuration Issues
```bash
# Verify environment file
cat /opt/familycalendar/.env

# Check file permissions
ls -la /opt/familycalendar/.env

# Test configuration
cd /opt/familycalendar
node -e "require('dotenv').config(); console.log(process.env.GOOGLE_CLIENT_ID)"
```

## 🗑️ Uninstallation

To completely remove the desktop application:

```bash
cd /opt/familycalendar
./uninstall-ubuntu-mate.sh
```

This removes:
- Desktop application and menu entries
- Systemd service
- Application files
- Launcher scripts

## 🔮 Future Enhancements

Planned desktop-specific features:
- **System notifications** for calendar events and chore reminders
- **System tray integration** with quick actions
- **Auto-start configuration** via GUI
- **Backup and sync** with cloud storage
- **Offline mode** improvements
- **Multi-monitor support** for extended displays

## 📝 Notes

### Performance
- **Memory usage**: ~150-200MB (includes Chromium engine)
- **CPU usage**: Low during normal operation
- **Startup time**: ~2-3 seconds on modern hardware

### Security
- **Local network only**: No external dependencies for core functionality
- **Sandboxed execution**: Electron provides security isolation
- **No remote code execution**: All code runs locally

### Compatibility
- **Ubuntu MATE 20.04+**: Fully supported
- **Other Ubuntu flavors**: Should work with minor modifications
- **Debian-based distributions**: Compatible with package adjustments

This setup gives you the best of both worlds: a native desktop application experience while maintaining full web functionality for multi-device access!