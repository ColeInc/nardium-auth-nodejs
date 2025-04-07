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
    // Try to get IP from various headers that might be present in serverless environments
    const ip = req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.ip ||
      req.connection.remoteAddress ||
      'unknown';

    // If it's an array, take the first IP
    return Array.isArray(ip) ? ip[0] : ip;
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