#!/usr/bin/env node

// BULLETPROOF RENDER DEPLOYMENT SCRIPT
// This file ensures Render can start our TypeScript server no matter what

import { spawn } from 'child_process';
import { readdir } from 'fs';
import { promisify } from 'util';

const readdirAsync = promisify(readdir);

async function startServer() {
  console.log('🚀 Auxin Backend - Starting TypeScript Server...');
  console.log('📍 Current directory:', process.cwd());

  try {
    const files = await readdirAsync('.');
    console.log('📁 Files in directory:', files.join(', '));
  } catch (error) {
    console.log('📁 Could not list files:', error.message);
  }

  // Set production environment
  process.env.NODE_ENV = 'production';

  console.log('🔧 Starting server with tsx...');

  // Start the server using tsx
  const server = spawn('npx', ['tsx', 'src/server.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env
  });

  server.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`🔄 Server exited with code: ${code}`);
    process.exit(code || 0);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📡 Received SIGTERM - shutting down...');
    server.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('📡 Received SIGINT - shutting down...');
    server.kill('SIGINT');
  });
}

// Start the server
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
