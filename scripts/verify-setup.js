#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Electron Desktop App Setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'electron/main.ts',
  'electron/preload.ts',
  'src/main.tsx',
  'src/App.tsx',
  'index.html'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.log('❌ Missing required files:');
  missingFiles.forEach(file => console.log(`   - ${file}`));
  process.exit(1);
} else {
  console.log('✅ All required files present');
}

// Check package.json scripts
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['electron:dev', 'electron:dist', 'electron:pack'];
const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);

if (missingScripts.length > 0) {
  console.log('❌ Missing required scripts:');
  missingScripts.forEach(script => console.log(`   - ${script}`));
} else {
  console.log('✅ All desktop build scripts configured');
}

// Check electron-builder config
if (packageJson.build) {
  console.log('✅ Electron-builder configuration found');
  
  const platforms = [];
  if (packageJson.build.win) platforms.push('Windows');
  if (packageJson.build.mac) platforms.push('macOS');
  if (packageJson.build.linux) platforms.push('Linux');
  
  console.log(`📦 Configured for: ${platforms.join(', ')}`);
} else {
  console.log('❌ Missing electron-builder configuration');
}

console.log('\n🎉 Desktop app setup verification complete!');
console.log('\nNext steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Start development: npm run electron:dev');
console.log('3. Build desktop app: npm run electron:dist');
