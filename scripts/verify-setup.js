#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('Verifying Electron desktop app setup...\n')

// Check required files within apps/desktop
const appDir = path.join(__dirname, '..', 'apps', 'desktop')
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'electron/main.ts',
  'electron/preload.ts',
  'src/main.tsx',
  'src/App.tsx',
  'index.html',
]

const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(appDir, file)))

if (missingFiles.length > 0) {
  console.log('Missing required files:')
  missingFiles.forEach(file => console.log(`  - ${file}`))
  process.exitCode = 1
} else {
  console.log('✔ All required files present')
}

// Check package.json scripts
const rootPkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
const requiredScripts = ['electron:dev', 'electron:dist']
const missingScripts = requiredScripts.filter(
  script => !rootPkg.scripts || !rootPkg.scripts[script]
)

if (missingScripts.length > 0) {
  console.log('Missing required root scripts:')
  missingScripts.forEach(script => console.log(`  - ${script}`))
} else {
  console.log('✔ Root desktop scripts configured')
}

// Check electron-builder config in app package
const appPkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'))
if (appPkg.build) {
  console.log('✔ Electron-builder configuration found')
  const platforms = []
  if (appPkg.build.win) platforms.push('Windows')
  if (appPkg.build.mac) platforms.push('macOS')
  if (appPkg.build.linux) platforms.push('Linux')
  console.log(`Configured for: ${platforms.join(', ') || 'none'}`)
} else {
  console.log('Missing electron-builder configuration')
}

console.log('\nDesktop app setup verification complete!')
