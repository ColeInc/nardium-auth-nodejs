# Migration to Vercel Dev

This document outlines the migration process from the previous development setup to using Vercel Dev for local development.

## Changes Made

1. **Configuration Files Location**
   - Moved `vercel.json` to the `/api` directory
   - Moved environment files (`.env.development` and `.env.production.example`) to the `/api` directory
   - Updated paths in `vercel.json` to be relative to the `/api` directory

2. **Environment Setup**
   - Created a setup script at `/api/scripts/setup-vercel-dev.js`
   - Script creates the necessary environment files if they don't exist
   - Updated environment file loading in `/api/src/utils/env.ts` to use paths relative to the API directory

3. **Development Workflow**
   - Changed the `dev` script in `package.json` from using `ts-node-dev` to `vercel dev`
   - Added `setup` script to initialize the Vercel Dev environment
   - Added Vercel CLI as a development dependency

4. **API Structure**
   - Consolidated all configuration and deployment files in the `/api` directory
   - Maintained the existing source code structure
   - Updated documentation to reflect the new serverless-first approach

## Benefits of Migration

1. **Consistent Environment:** The local development environment now closely mirrors the production serverless environment.

2. **Simplified Deployment:** The same configuration is used for both development and production.

3. **Best Practices:** Following industry standards for Vercel-based projects with API directories.

4. **Improved Development Experience:** The Vercel Dev server handles routing, environment variables, and hot reloading automatically.

## Running the Project

1. Run setup:
   ```bash
   npm run setup
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

## Troubleshooting

If you encounter issues with the Vercel Dev server:

1. Check that the `.env.development` file exists in the `/api` directory
2. Ensure Vercel CLI is installed: `npm install -g vercel` or use the local installation
3. Try running with verbose logging: `vercel dev --debug` 