// Simple build script for Vercel
const fs = require('fs');
const path = require('path');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Copy index.html to dist
fs.copyFileSync('index.html', 'dist/index.html');

console.log('Build completed successfully');