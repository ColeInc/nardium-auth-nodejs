import { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import app from '../src/app';
import { env } from '../src/utils/env';
import { initializeResources, isHealthCheckPath } from '../src/lib/initialization';

// Pre-initialize on module load - this happens once per instance
// and will be reused for subsequent invocations on the same instance
initializeResources().catch(err => {
    console.error('Failed to initialize resources:', err);
});

// Log the environment just once per instance
console.log(`Serverless function initialized in ${env.NODE_ENV} mode`);

// Log incoming request details
const logRequestDetails = (req: VercelRequest) => {
    console.log(`Incoming request: ${req.method} ${req.url}`);
    console.log(`Request headers: ${JSON.stringify(req.headers)}`);
};

// Create a serverless handler from the Express app
const handler = serverless(app, {
    request: (req: any) => {
        // Record request start time for logging
        req._startTime = Date.now();
        console.log(`Request started: ${req.method} ${req.url || req.path}`);

        // Ensure req has the right structure for our middleware and controllers
        if (!req.user) {
            req.user = undefined; // Initialize to prevent TypeScript errors
        }

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
export default async function (req: VercelRequest, res: VercelResponse) {
    try {
        const requestPath = req.url || '';
        console.log(`Processing request for path: ${requestPath}`);

        // For health checks, respond immediately without waiting for full initialization
        if (isHealthCheckPath(requestPath)) {
            console.log('Health check detected, expediting response');
            const healthcheck = {
                uptime: process.uptime(),
                message: 'OK',
                timestamp: Date.now()
            };
            res.status(200).json(healthcheck);
            return;
        }

        // For Stripe webhook requests, we handle it in a separate dedicated function
        if (requestPath === '/api/stripe/webhook') {
            console.log('Stripe webhook request detected, but should be handled by dedicated function');
            res.status(404).json({ error: 'Webhook endpoint moved to dedicated function' });
            return;
        }

        // Ensure resources are initialized before handling request
        await initializeResources(requestPath);
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