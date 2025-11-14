#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Simple recursive copy function
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

// Create public directory
if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

// Copy static files
const filesToCopy = [
  'index.html',
  'styles.css',
  'script.js',
  'config.json',
  'banks.json',
  'giftCards.json',
  'pendingApplications.json',
  '_redirects'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
    console.log(`✓ Copied ${file}`);
  }
});

// Copy directories
const dirsToCopy = ['registration', 'transfer', 'banks', 'admin', 'data'];

dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    copyDir(dir, path.join('public', dir));
    console.log(`✓ Copied ${dir}/`);
  }
});

console.log('\n✅ Build complete: all files copied to public/');
