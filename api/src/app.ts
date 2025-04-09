import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import router from './routes';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Security middleware configuration
app.use(helmet());

// Set up a middleware specifically for Stripe webhook endpoints
// This must come BEFORE any other middleware that parses the body
app.use((req, res, next) => {
  // Only use raw parser for Stripe webhook endpoints
  if (req.originalUrl === '/api/payments/webhook' ||
    req.originalUrl === '/api/stripe/webhook') {
    // Use express.raw with no transformations for Stripe webhook endpoints
    express.raw({
      type: 'application/json',
      limit: '10mb' // Allow larger payloads
    })(req, res, next);
  } else {
    next();
  }
});

// Body parser middleware is handled in routes/index.ts
// to properly handle Stripe webhooks that need raw body data

// Cookie parser middleware
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: process.env.CHROME_EXTENSION_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Version', 'X-Client-ID', 'X-CSRF-Token', 'Stripe-Signature'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
}));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  // Add custom key generator for serverless environments
  keyGenerator: (req) => {
    // Get IP from various headers that might be present in serverless environments
    const forwardedFor = req.headers['x-forwarded-for'];
    const realIp = req.headers['x-real-ip'];
    const remoteAddr = req.connection?.remoteAddress;

    // If x-forwarded-for exists, use the first IP (client's original IP)
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor : forwardedFor.split(',');
      return ips[0].trim();
    }

    // Fallback to x-real-ip
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback to remote address
    if (remoteAddr) {
      return remoteAddr;
    }

    // If all else fails, use a fallback identifier
    return 'unknown';
  }
});
app.use(limiter);

// CSRF protection
// app.use(csrf({ cookie: true }));

// Routes
app.use('/api', router);

// Add startup logging
console.log(`Server configured and ready to start`);

export default app; 