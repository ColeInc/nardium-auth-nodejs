import { Request, Response, NextFunction } from 'express';
import { env } from './utils/env';

/**
 * Development-specific middleware to ensure CORS headers are set
 * This is used to fix CORS issues in local development with chrome extensions
 */
export const devCorsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Only apply in development mode
    if (env.NODE_ENV !== 'development') {
        return next();
    }

    // Get the origin from headers
    const origin = req.headers.origin;

    // Set CORS headers for development and Chrome extensions
    if (origin) {
        // Chrome extension origins should always be allowed in development
        if (origin.startsWith('chrome-extension://')) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Client-Version,X-Client-ID,X-CSRF-Token,Stripe-Signature,X-Authorization,X-Forwarded-Authorization');

            // Handle preflight request
            if (req.method === 'OPTIONS') {
                res.status(204).end();
                return;
            }
        }
    }

    next();
}; 