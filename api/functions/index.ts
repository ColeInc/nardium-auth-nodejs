import { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import app from '../src/app';
import { env } from '../src/utils/env';
import { initializeResources } from '../src/lib/initialization';

// Pre-initialize on module load - this happens once per instance
// and will be reused for subsequent invocations on the same instance
initializeResources().catch(err => {
    console.error('Failed to initialize resources:', err);
});

// Log the environment just once per instance
console.log(`Serverless function initialized in ${env.NODE_ENV} mode`);

// Create a serverless handler from the Express app
const handler = serverless(app, {
    request: (req: any) => {
        // Record request start time for logging
        req._startTime = Date.now();
        console.log(`Request started: ${req.method} ${req.url}`);
        return req;
    },
    response: (res: any) => {
        // Log request completion time
        const startTime = res.req._startTime || Date.now();
        const duration = Date.now() - startTime;
        console.log(`Request completed in ${duration}ms: ${res.statusCode}`);
        return res;
    }
});

// Export the handler function for Vercel
export default async function (req: VercelRequest, res: VercelResponse): Promise<any> {
    // Check for warmup requests
    if (req.headers['x-warmer'] === 'true') {
        console.log('Handling warm-up request');
        return res.status(200).send('Warmed');
    }

    try {
        // Ensure resources are initialized before handling request
        await initializeResources();
        return await handler(req, res);
    } catch (error) {
        console.error('Serverless handler error:', error);

        // Provide graceful error response
        res.status(500).json({
            error: 'Server error',
            request_id: req.headers['x-vercel-id'] || 'unknown'
        });
    }
} 