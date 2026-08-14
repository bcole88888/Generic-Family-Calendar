#!/bin/bash

# Family Calendar Desktop App Installation Script for Ubuntu MATE
# This script installs the Family Calendar as both a web service and desktop application

set -e

echo "🏠 Family Calendar Desktop Installation for Ubuntu MATE"
echo "======================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root. Please run as a regular user."
   exit 1
fi

# Variables
APP_NAME="familycalendar"
INSTALL_DIR="/opt/familycalendar"
SERVICE_NAME="familycalendar"
DESKTOP_FILE="familycalendar.desktop"
CURRENT_DIR=$(pwd)

echo "📋 Installation Summary:"
echo "   • App will be installed to: $INSTALL_DIR"
echo "   • Desktop app available in applications menu"
echo "   • Web interface available at: http://localhost:3000"
echo "   • Service name: $SERVICE_NAME"
echo ""

read -p "Continue with installation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

# Check if Node.js is installed
echo "🔍 Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

NODE_VERSION=$(node --version)
echo "✅ Node.js version: $NODE_VERSION"

# Install system dependencies
echo "📦 Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y curl build-essential git

# Create installation directory
echo "📁 Creating installation directory..."
sudo mkdir -p $INSTALL_DIR
sudo chown $USER:$USER $INSTALL_DIR

# Copy application files
echo "📋 Copying application files..."
cp -r $CURRENT_DIR/* $INSTALL_DIR/
cd $INSTALL_DIR

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Install Electron dependencies for desktop app
echo "🖥️  Installing Electron dependencies..."
npm install electron electron-builder electron-is-dev concurrently wait-on --save-dev

# Create systemd service for web interface
echo "⚙️  Creating systemd service..."
sudo tee /etc/systemd/system/$SERVICE_NAME.service > /dev/null <<EOF
[Unit]
Description=Family Calendar Application
Documentation=file://$INSTALL_DIR/README.md
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node app.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
echo "🚀 Enabling and starting the service..."
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME
sudo systemctl start $SERVICE_NAME

# Install desktop application
echo "🖥️  Installing desktop application..."
sudo cp $DESKTOP_FILE /usr/share/applications/
sudo chmod +x /usr/share/applications/$DESKTOP_FILE

# Create application launcher script
sudo tee /usr/local/bin/family-calendar > /dev/null <<EOF
#!/bin/bash
cd $INSTALL_DIR
npm run electron
EOF
sudo chmod +x /usr/local/bin/family-calendar

# Update desktop file with correct paths
sudo sed -i "s|/opt/familycalendar/family-calendar|/usr/local/bin/family-calendar|g" /usr/share/applications/$DESKTOP_FILE

# Create start script for development
tee $INSTALL_DIR/start-desktop.sh > /dev/null <<EOF
#!/bin/bash
cd $INSTALL_DIR
npm run electron
EOF
chmod +x $INSTALL_DIR/start-desktop.sh

echo ""
echo "🎉 Installation Complete!"
echo "========================"
echo ""
echo "📱 Desktop App:"
echo "   • Available in Applications menu as 'Family Calendar'"
echo "   • Or run: family-calendar"
echo "   • Or run: $INSTALL_DIR/start-desktop.sh"
echo ""
echo "🌐 Web Interface:"
echo "   • Available at: http://localhost:3000"
echo "   • Service status: sudo systemctl status $SERVICE_NAME"
echo "   • Service logs: sudo journalctl -u $SERVICE_NAME -f"
echo ""
echo "⚙️  Configuration:"
echo "   • Edit: $INSTALL_DIR/.env"
echo "   • Restart service: sudo systemctl restart $SERVICE_NAME"
echo ""
echo "🔧 Troubleshooting:"
echo "   • Check service: sudo systemctl status $SERVICE_NAME"
echo "   • View logs: sudo journalctl -u $SERVICE_NAME"
echo "   • Test desktop app: $INSTALL_DIR/start-desktop.sh"
echo ""

# Check if service is running
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Web service is running!"
    echo "   Open http://localhost:3000 in your web browser"
else
    echo "⚠️  Web service failed to start. Check logs with:"
    echo "   sudo journalctl -u $SERVICE_NAME"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Configure Google Calendar and Apple Calendar in $INSTALL_DIR/.env"
echo "2. Restart service: sudo systemctl restart $SERVICE_NAME"
echo "3. Launch desktop app from Applications menu or run 'family-calendar'"
echo ""