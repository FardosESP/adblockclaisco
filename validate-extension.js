#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🛡️  AdBlock Pro - Extension Validator\n');
console.log('=' .repeat(50));

const requiredFiles = [
  'manifest.json',
  'background.js',
  'content-script.js',
  'injected-script.js',
  'popup.html',
  'popup.js',
  'rules.json',
  'config.js'
];

let allValid = true;

requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  if (!exists) allValid = false;
});

console.log('=' .repeat(50));

if (allValid) {
  console.log('✅ All extension files present');
  console.log('\n📦 Extension ready for testing in Brave/Chrome');
  console.log('\n📖 To install:');
  console.log('  1. Open brave://extensions or chrome://extensions');
  console.log('  2. Enable "Developer mode"');
  console.log('  3. Click "Load unpacked"');
  console.log('  4. Select this directory');
  console.log('\n🎯 Features:');
  console.log('  • Multi-level blocking (Basic/Advanced/Aggressive)');
  console.log('  • YouTube & Twitch ad blocking');
  console.log('  • Tracker & miner protection');
  console.log('  • Anti-detection system');
  console.log('\n✨ Extension is validated and ready!\n');
} else {
  console.log('❌ Some extension files are missing');
  process.exit(1);
}
