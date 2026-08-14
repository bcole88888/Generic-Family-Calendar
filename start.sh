#!/bin/bash

# Family Calendar Startup Script

echo "🏠 Starting Family Calendar Application..."

# Check if running as systemd service
if systemctl is-active --quiet familycalendar.service; then
    echo "✅ Service is already running via systemd"
    echo "📱 Access your family calendar at: http://localhost:3000"
    echo "🔗 Or at: http://$(hostname -I | awk '{print $1}'):3000"
    exit 0
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one with your configuration."
    echo "See README.md for configuration details."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p data
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
fi

echo "✅ All checks passed!"
echo "🚀 Starting Family Calendar on port 3000..."
echo "📱 Access your family calendar at: http://localhost:3000"
echo "🔗 Or at: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================================"

# Start the application
npm start