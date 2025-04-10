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
        console.log("OG REQ original request coming in:", req)

        // Record request start time for logging
        req._startTime = Date.now();

        // CRITICAL: Preserve original request details before any modifications
        req._originalUrl = req.url;
        req._originalHeaders = { ...req.headers };
        console.log("original url and headers:", req._originalHeaders, req._originalUrl)

        // Add detailed logging of query parameters
        console.log("Request query parameters:", req.query);
        console.log("Request URL object:", req.url);
        console.log("Request path:", req.path);
        console.log("Request method:", req.method);
        console.log("Request body available:", !!req.body);

        // Check for special cases (Stripe webhooks) - don't modify these at all
        if (req.url?.includes('/payments/webhook') || req.url?.includes('/stripe/webhook')) {
            console.log('Webhook detected - preserving raw request');
            return req;
        }

        // The problem: Vercel dev environment doesn't properly forward Authorization headers
        // Fix: Check for auth headers in various places and reconstruct if needed
        if (!req.headers.authorization) {
            // Try to locate authorization header from x-headers or other places
            const authHeader =
                req.headers['x-authorization'] ||
                req.headers['x-forwarded-authorization'] ||
                req._originalHeaders?.authorization;

            if (authHeader) {
                console.log('Found authorization header in alternate location, restoring it');
                req.headers.authorization = authHeader;
            }
        }

        // Log headers for debugging
        console.log('Request headers after processing:', {
            authorization: req.headers.authorization ? 'Bearer <token>' : 'missing',
            'content-type': req.headers['content-type'],
            host: req.headers.host,
            origin: req.headers.origin
        });

        // Special handling for dev mode path resolution
        if (env.NODE_ENV === 'development' && req.url === '/' && req.method === 'GET') {
            // Attempt to recover the path from headers or query
            const referer = req.headers.referer;
            if (referer && referer.includes('/api/auth/')) {
                const match = referer.match(/\/api\/auth\/[^?#]+/);
                if (match) {
                    console.log(`Recovered auth path from referer: ${match[0]}`);
                    // Remove /api prefix as it's added back in the Express router mounting
                    req.url = match[0].replace(/^\/api/, '');
                }
            }
        }

        // Log the final request URL and path
        console.log(`Serverless handler - Final request: ${req.method} ${req.url}`);
        console.log("final req going back:", req)
        return req;
    }
});

// Export the handler function for Vercel
export default async function (req: VercelRequest, res: VercelResponse) {
    try {
        console.log("og og req req", req)
        // Log the request
        console.log(`Serverless entry point - Request: ${req.method} ${req.url}`);

        // DIRECT FORCED CORS HEADERS - Immediately set them
        res.setHeader('X-Fun-Test', 'peekaboo');
        res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://kdmdhielhebecglcnejeakebepepiogf');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Client-Version,X-Client-ID,X-CSRF-Token,Stripe-Signature,X-Authorization,X-Forwarded-Authorization,X-Fun-Text');

        // For preflight requests, immediately return 204 success
        if (req.method === 'OPTIONS') {
            console.log('CORS preflight request detected, sending 204 response');
            res.status(204).end();
            return;
        }

        // Log Vercel-specific request properties
        console.log('Vercel request query:', req.query);
        console.log('Vercel request body available:', !!req.body);
        console.log('Vercel request cookies:', req.cookies);
        console.log('Vercel request URL structure:', {
            url: req.url,
            baseUrl: (req as any).baseUrl,
            originalUrl: (req as any).originalUrl,
            path: (req as any).path
        });

        // Special case - health check
        if (isHealthCheckPath(req.url || '')) {
            console.log('Health check detected, expediting response');
            res.status(200).json({
                uptime: process.uptime(),
                message: 'OK',
                timestamp: Date.now()
            });
            return;
        }

        // Special case - Stripe webhook
        // Directly pass to the dedicated handler without any processing
        if (req.url?.includes('/stripe/webhook') || req.url?.includes('/payments/webhook')) {
            console.log('Stripe webhook detected, preserving raw body');
            // Set a flag on the request to indicate this is a webhook
            (req as any)._isWebhook = true;
        }

        // Critical for auth: Preserve Authorization header
        if (req.headers.authorization) {
            // Debugging to verify the header is present
            console.log('Authorization header found in original request');

            // Add it to custom headers that might be preserved better
            req.headers['x-authorization'] = req.headers.authorization;
            // req.headers['x-forwarded-authorization'] = req.headers.authorization;
        }

        // Initialize resources for non-webhook requests
        await initializeResources();

        // Hand off to the serverless handler
        console.log('Passing request to Express handler');
        // Use our custom response interception
        return await handler(req, res);
    } catch (error) {
        console.error('Serverless handler error:', error);
        // Even for errors, make sure CORS headers are set
        res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://kdmdhielhebecglcnejeakebepepiogf');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.status(500).json({
            error: 'Server error',
            request_id: req.headers['x-vercel-id'] || 'unknown'
        });
    }
} 