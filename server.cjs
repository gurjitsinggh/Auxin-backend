#!/usr/bin/env node

/**
 * Root-level fallback entry point for Render deployment
 * This ensures maximum compatibility with different deployment scenarios
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting TypeScript server via root fallback...');
console.log('📁 Current working directory:', process.cwd());

// List directory contents for debugging
const fs = require('fs');
try {
  const files = fs.readdirSync(process.cwd());
  console.log('📋 Current directory contents:', files);
} catch (error) {
  console.error('❌ Error reading directory:', error);
}

// Start the TypeScript server
const server = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

server.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully...');
  server.kill('SIGINT');
});
