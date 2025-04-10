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

// Create a serverless handler from the Express app
const handler = serverless(app, {
    request: (req: any) => {
        // Record request start time for logging
        req._startTime = Date.now();

        // This fixes the path issue in development and production
        // Extract the actual path from x-forwarded-prefix or x-original-url headers
        const originalUrl = req.headers?.['x-original-url']
            || req.headers?.['x-forwarded-prefix']
            || '';

        console.log('Headers for URL identification:', {
            url: req.url,
            originalUrl: req.originalUrl,
            'x-original-url': req.headers?.['x-original-url'],
            'x-forwarded-prefix': req.headers?.['x-forwarded-prefix'],
            'x-vercel-deployment-url': req.headers?.['x-vercel-deployment-url'],
        });

        // Special handling for Vercel development environment
        if (env.NODE_ENV === 'development') {
            // In Vercel dev, we need to recover the original URL from Vercel's routing
            const originalPath = req.headers['x-vercel-original-path'] || req.headers['x-original-url'] || req.url;
            console.log(`Original path from headers: ${originalPath}`);

            // Re-check forwarded headers to find the real path
            const forwardedHost = req.headers['x-forwarded-host'];
            const forwardedProto = req.headers['x-forwarded-proto'];
            const forwardedPort = req.headers['x-forwarded-port'];

            console.log(`Forwarded info: host=${forwardedHost}, proto=${forwardedProto}, port=${forwardedPort}`);

            // Check the referrer which might include the original path
            const referer = req.headers.referer;
            console.log(`Referer: ${referer}`);

            // Try to recover from URL pattern
            if (req.url === '/' && req.headers.origin?.includes('chrome-extension')) {
                // This is likely a CORS preflight or request from the Chrome extension
                if (req.method === 'OPTIONS') {
                    console.log('CORS preflight detected');
                } else {
                    // Try to determine the correct path for extension requests
                    // Based on the request headers and patterns
                    if (req.headers['access-control-request-method'] === 'GET') {
                        const pathPattern = req.headers.origin.includes('kdmdhielhebecglcnejeakebepepiogf')
                            ? '/auth/google/refresh-token'  // Match to your extension ID pattern
                            : '/auth/google/callback';

                        console.log(`Recovered path ${pathPattern} from Chrome extension pattern`);
                        req.url = pathPattern;
                    }
                }
            }
        }

        // Log the modified request URL
        console.log(`Serverless handler - Final request path: ${req.method} ${req.url}`);
        return req;
    },
    response: (res: any) => {
        // Log request completion time
        const startTime = res.req._startTime || Date.now();
        const duration = Date.now() - startTime;
        console.log(`Serverless handler - Request completed in ${duration}ms: ${res.statusCode}`);
        return res;
    }
});

// Export the handler function for Vercel
export default async function (req: VercelRequest, res: VercelResponse) {
    try {
        // Log the original request
        console.log(`Serverless entry point - Original request: ${req.method} ${req.url}`);

        // Store the original URL for debugging
        const originalUrl = req.url;

        // For health checks, respond immediately without waiting for full initialization
        if (isHealthCheckPath(req.url || '')) {
            console.log('Health check detected, expediting response');
            const healthcheck = {
                uptime: process.uptime(),
                message: 'OK',
                timestamp: Date.now()
            };
            res.status(200).json(healthcheck);
            return;
        }

        // Extract path and parameters from actual headers for debugging
        console.log('Request headers for path recovery:', {
            'host': req.headers.host,
            'x-forwarded-host': req.headers['x-forwarded-host'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-vercel-id': req.headers['x-vercel-id'],
            'origin': req.headers.origin,
            'referer': req.headers.referer,
        });

        // For all other requests, ensure resources are initialized
        await initializeResources();

        // Pass request to the Express handler
        console.log('Passing request to Express app handler');
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