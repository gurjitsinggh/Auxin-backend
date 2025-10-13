#!/usr/bin/env node

// Fallback start script for deployment platforms
// This ensures TypeScript is run directly using tsx

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Auxin Backend with TypeScript...');

// Set production environment
process.env.NODE_ENV = 'production';

// Start the TypeScript server using tsx
const serverProcess = spawn('npx', ['tsx', 'src/server.ts'], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📡 Received SIGTERM, shutting down gracefully...');
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('📡 Received SIGINT, shutting down gracefully...');
  serverProcess.kill('SIGINT');
});
