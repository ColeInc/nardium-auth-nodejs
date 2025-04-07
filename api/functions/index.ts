import { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import app from '../src/app';
import { env } from '../src/utils/env';

// Log the environment
console.log(`Serverless function running in ${env.NODE_ENV} mode`);

// Create a serverless handler from the Express app
const handler = serverless(app);

// Export the handler function for Vercel
export default async function (req: VercelRequest, res: VercelResponse): Promise<any> {
    return handler(req, res);
} 