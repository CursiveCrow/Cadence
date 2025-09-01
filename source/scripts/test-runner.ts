#!/usr/bin/env bun

/**
 * Bun Test Runner with Performance Metrics
 */

import { spawn } from 'bun'

const args = process.argv.slice(2)
const isWatch = args.includes('--watch')
const isCoverage = args.includes('--coverage')
const isBench = args.includes('--bench')

console.log('🧪 Running tests with Bun...\n')

// Performance tracking
const startTime = Bun.nanoseconds()

// Configure test command
let testCommand = ['bun', 'test']

if (isWatch) {
  testCommand.push('--watch')
  console.log('👀 Watch mode enabled')
}

if (isCoverage) {
  testCommand.push('--coverage')
  console.log('📊 Coverage reporting enabled')
}

if (isBench) {
  // Run benchmarks instead
  testCommand = ['bun', 'run', 'benchmarks/task-operations.bench.ts']
  console.log('⚡ Running performance benchmarks')
}

// Add any additional args
const filteredArgs = args.filter(arg => !['--watch', '--coverage', '--bench'].includes(arg))
testCommand.push(...filteredArgs)

// Run tests
const proc = spawn({
  cmd: testCommand,
  stdout: 'pipe',
  stderr: 'pipe',
  stdin: 'inherit'
})

// Stream output
const reader = proc.stdout.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  
  const text = decoder.decode(value)
  process.stdout.write(text)
}

// Wait for completion
const exitCode = await proc.exited

// Performance metrics
const endTime = Bun.nanoseconds()
const duration = (endTime - startTime) / 1_000_000 // Convert to milliseconds

console.log(`\n⏱️  Total test time: ${duration.toFixed(2)}ms`)
console.log(`🏃 Runtime: Bun v${Bun.version}`)

if (!isWatch) {
  // Memory usage after tests
  const memUsage = process.memoryUsage()
  console.log(`💾 Memory used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`)
  console.log(`📊 Exit code: ${exitCode}`)
}

process.exit(exitCode)

