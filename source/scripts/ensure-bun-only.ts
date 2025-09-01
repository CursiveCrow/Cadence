#!/usr/bin/env bun

/**
 * Ensure Bun-Only Project
 * Checks for and removes npm/yarn artifacts to prevent confusion
 */

import { existsSync, unlinkSync, rmSync } from 'fs'
import { $ShellOutput } from 'bun'

console.log('🔍 Checking for npm/yarn artifacts...\n')

const artifactsToRemove = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.npmrc.backup',
    '.yarnrc',
    '.pnpmrc'
]

const foldersToCheck = [
    'node_modules/.package-lock.json',
    'node_modules/.yarn-integrity'
]

let foundArtifacts = false

// Check for lock files
console.log('🔒 Checking for lock files...')
for (const artifact of artifactsToRemove) {
    if (existsSync(artifact)) {
        console.log(`❌ Found: ${artifact}`)
        try {
            unlinkSync(artifact)
            console.log(`✅ Removed: ${artifact}`)
            foundArtifacts = true
        } catch (error) {
            console.log(`⚠️  Could not remove ${artifact}: ${error}`)
        }
    }
}

// Check for npm/yarn metadata in node_modules
console.log('\n📁 Checking node_modules for npm/yarn metadata...')
for (const folder of foldersToCheck) {
    if (existsSync(folder)) {
        console.log(`❌ Found: ${folder}`)
        try {
            unlinkSync(folder)
            console.log(`✅ Removed: ${folder}`)
            foundArtifacts = true
        } catch (error) {
            console.log(`⚠️  Could not remove ${folder}: ${error}`)
        }
    }
}

// Check if npm or yarn are in PATH and warn
console.log('\n🛠️  Checking for npm/yarn in PATH...')
try {
    const npmCheck = await $`which npm`.quiet()
    if (npmCheck.exitCode === 0) {
        console.log('⚠️  npm is installed on this system')
        console.log('   Remember to use "bun" instead of "npm"')
    }
} catch {
    console.log('✅ npm not found in PATH')
}

try {
    const yarnCheck = await $`which yarn`.quiet()
    if (yarnCheck.exitCode === 0) {
        console.log('⚠️  yarn is installed on this system')
        console.log('   Remember to use "bun" instead of "yarn"')
    }
} catch {
    console.log('✅ yarn not found in PATH')
}

// Check package.json scripts for npm/yarn references
console.log('\n📄 Checking package.json for npm/yarn references...')
try {
    const packageJson = await Bun.file('package.json').text()

    const npmReferences = [
        /npm\s+install/g,
        /npm\s+run/g,
        /yarn\s+install/g,
        /yarn\s+run/g,
        /npx\s+/g,
        /node\s+/g
    ]

    let hasReferences = false
    for (const regex of npmReferences) {
        if (regex.test(packageJson)) {
            hasReferences = true
            break
        }
    }

    if (hasReferences) {
        console.log('⚠️  Found npm/yarn references in package.json scripts')
        console.log('   Consider updating these to use Bun equivalents')
    } else {
        console.log('✅ No npm/yarn references found in package.json')
    }
} catch (error) {
    console.log(`❌ Could not check package.json: ${error}`)
}

// Verify Bun is working
console.log('\n🚀 Verifying Bun setup...')
console.log(`✅ Bun version: ${Bun.version}`)
console.log(`✅ Runtime: ${process.versions.bun ? 'Bun' : 'Node.js (Wrong!)'}`)

if (existsSync('bun.lockb')) {
    console.log('✅ Bun lockfile exists')
} else {
    console.log('⚠️  Bun lockfile missing - run "bun install"')
}

// Summary
console.log('\n📋 Summary:')
if (foundArtifacts) {
    console.log('🧹 Cleaned up npm/yarn artifacts')
} else {
    console.log('✨ No npm/yarn artifacts found')
}

console.log('🎯 Project is Bun-only!')
console.log('\n💡 Quick commands:')
console.log('   bun install     - Install dependencies')
console.log('   bun run dev     - Start development')
console.log('   bun test        - Run tests')
console.log('   bun run build   - Build for production')
console.log('\n🚫 Do NOT use: npm, yarn, or node commands!')

// Exit with success
process.exit(0)

