// Simple script to create a basic calendar icon using HTML5 Canvas
// This creates a placeholder icon for the desktop application

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon for the calendar app
const svgIcon = `
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="256" height="256" rx="32" fill="#667eea"/>

  <!-- Calendar body -->
  <rect x="40" y="70" width="176" height="146" rx="8" fill="white"/>

  <!-- Calendar header -->
  <rect x="40" y="70" width="176" height="36" rx="8" fill="#764ba2"/>

  <!-- Spiral bindings -->
  <circle cx="80" cy="50" r="8" fill="none" stroke="#333" stroke-width="4"/>
  <circle cx="120" cy="50" r="8" fill="none" stroke="#333" stroke-width="4"/>
  <circle cx="160" cy="50" r="8" fill="none" stroke="#333" stroke-width="4"/>
  <circle cx="200" cy="50" r="8" fill="none" stroke="#333" stroke-width="4"/>

  <!-- Calendar grid lines -->
  <line x1="55" y1="125" x2="201" y2="125" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="55" y1="145" x2="201" y2="145" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="55" y1="165" x2="201" y2="165" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="55" y1="185" x2="201" y2="185" stroke="#e0e0e0" stroke-width="1"/>

  <line x1="75" y1="110" x2="75" y2="200" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="95" y1="110" x2="95" y2="200" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="115" y1="110" x2="115" y2="200" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="135" y1="110" x2="135" y2="200" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="155" y1="110" x2="155" y2="200" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="175" y1="110" x2="175" y2="200" stroke="#e0e0e0" stroke-width="1"/>

  <!-- Date number -->
  <text x="85" y="140" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#667eea">15</text>

  <!-- Small family icon -->
  <circle cx="165" cy="135" r="6" fill="#4CAF50"/>
  <circle cx="155" cy="145" r="4" fill="#4CAF50"/>
  <circle cx="175" cy="145" r="4" fill="#4CAF50"/>
  <circle cx="165" cy="155" r="3" fill="#4CAF50"/>
</svg>
`;

// Save SVG icon
fs.writeFileSync(path.join(__dirname, 'assets', 'icon.svg'), svgIcon);

console.log('✅ Created SVG icon at assets/icon.svg');
console.log('📝 Note: For production, convert this to PNG/ICO/ICNS format using online converters or image editing tools');
console.log('📝 Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512');