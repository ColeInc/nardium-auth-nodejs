#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Vercel Dev environment...');

// Create necessary environment files if they don't exist
const envDevPath = path.join(__dirname, '..', '.env.development');
if (!fs.existsSync(envDevPath)) {
  console.log('Creating .env.development file...');
  fs.writeFileSync(envDevPath, `NODE_ENV=development
PORT=3000
CHROME_EXTENSION_URL=http://localhost:3000`);
}

// Check if Vercel CLI is installed globally
let vercelInstalled = false;
try {
  execSync('vercel --version', { stdio: 'ignore' });
  vercelInstalled = true;
  console.log('Vercel CLI found globally.');
} catch (error) {
  console.log('Vercel CLI not found globally. Using local installation...');
}

console.log('Setup complete!');
console.log('\nTo run the development server:');
console.log('  npm run dev');
console.log('\nOn first run, you may be asked to link to a Vercel project.');
console.log('You can choose to:');
console.log('  1. Link to an existing project');
console.log('  2. Create a new project');
console.log('  3. Continue without linking (Choose "N" when asked to link)'); 