#!/bin/bash

# Family Calendar Desktop App Uninstallation Script for Ubuntu MATE

set -e

echo "🗑️  Family Calendar Desktop Uninstallation for Ubuntu MATE"
echo "=========================================================="

# Variables
APP_NAME="familycalendar"
INSTALL_DIR="/opt/familycalendar"
SERVICE_NAME="familycalendar"
DESKTOP_FILE="familycalendar.desktop"

echo "⚠️  This will remove:"
echo "   • Desktop application from Applications menu"
echo "   • Web service (systemd service)"
echo "   • Application files from $INSTALL_DIR"
echo "   • Launcher script from /usr/local/bin/family-calendar"
echo ""

read -p "Continue with uninstallation? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Uninstallation cancelled."
    exit 1
fi

# Stop and disable the service
echo "🛑 Stopping and disabling service..."
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    sudo systemctl stop $SERVICE_NAME
fi

if sudo systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
    sudo systemctl disable $SERVICE_NAME
fi

# Remove systemd service file
echo "🗑️  Removing systemd service..."
if [ -f "/etc/systemd/system/$SERVICE_NAME.service" ]; then
    sudo rm /etc/systemd/system/$SERVICE_NAME.service
    sudo systemctl daemon-reload
fi

# Remove desktop application
echo "🖥️  Removing desktop application..."
if [ -f "/usr/share/applications/$DESKTOP_FILE" ]; then
    sudo rm /usr/share/applications/$DESKTOP_FILE
fi

# Remove launcher script
echo "🗑️  Removing launcher script..."
if [ -f "/usr/local/bin/family-calendar" ]; then
    sudo rm /usr/local/bin/family-calendar
fi

# Remove application directory
echo "📁 Removing application directory..."
if [ -d "$INSTALL_DIR" ]; then
    sudo rm -rf $INSTALL_DIR
fi

# Update desktop database
echo "🔄 Updating desktop database..."
if command -v update-desktop-database &> /dev/null; then
    sudo update-desktop-database /usr/share/applications/ 2>/dev/null || true
fi

echo ""
echo "✅ Uninstallation Complete!"
echo "========================="
echo ""
echo "The Family Calendar desktop application has been completely removed."
echo ""
echo "Note: This does not remove Node.js or other system dependencies"
echo "that were installed during the installation process."
echo ""