import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import router from './routes';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();

// Development CORS middleware - must be first for Chrome extensions in dev mode
// app.use(devCorsMiddleware);

// Security middleware configuration
app.use(helmet({
  // Disable Content-Security-Policy which can interfere with CORS
  contentSecurityPolicy: false,
  // Allow cross-origin frames
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
}));

// Request/response logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`Express app - Request received: ${req.method} ${req.originalUrl} (path: ${req.path})`);

  // Debug authorization header presence (without exposing token)
  console.log('Express app - Authorization header present:', !!req.headers.authorization);

  // Print all request headers for debugging
  console.log('Express app - All Headers:', req.headers);

  // Track response timing
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Express app - Response: ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Set up a middleware specifically for Stripe webhook endpoints
// This must come BEFORE any other middleware that parses the body
app.use((req: Request, res: Response, next: NextFunction) => {
  // Check for webhook paths (with and without /api prefix for flexibility)
  const isWebhookPath =
    req.originalUrl === '/api/payments/webhook' ||
    req.originalUrl === '/payments/webhook' ||
    req.originalUrl === '/api/stripe/webhook' ||
    req.originalUrl === '/stripe/webhook' ||
    (req as any)._isWebhook === true;

  if (isWebhookPath) {
    console.log('Express app - Using raw parser for webhook path:', req.originalUrl);
    // Use express.raw with no transformations for Stripe webhook endpoints
    express.raw({
      type: 'application/json',
      limit: '10mb' // Allow larger payloads
    })(req, res, next);
  } else {
    next();
  }
});

// JSON body parser for non-webhook endpoints
app.use((req: Request, res: Response, next: NextFunction) => {
  const isWebhookPath =
    req.originalUrl === '/api/payments/webhook' ||
    req.originalUrl === '/payments/webhook' ||
    req.originalUrl === '/api/stripe/webhook' ||
    req.originalUrl === '/stripe/webhook' ||
    (req as any)._isWebhook === true;

  if (!isWebhookPath && !req.body) {
    console.log('Express app - Using JSON parser for non-webhook path:', req.originalUrl);
    express.json({
      limit: '10mb' // Allow larger payloads
    })(req, res, next);
  } else {
    next();
  }
});

// Cookie parser middleware
app.use(cookieParser());

// CORS is now handled at the serverless level - commenting out Express CORS middleware
/* 
app.use(cors({
  origin: function (origin, callback) {
    // No origin means same-origin request (from server side)
    if (!origin) {
      callback(null, true);
      return;
    }
    
    // Always allow Chrome extension origins
    if (origin.startsWith('chrome-extension://')) {
      callback(null, true);
      return;
    }

    // Allow any origin in development
    if (process.env.NODE_ENV === 'development') {
      callback(null, true);
      return;
    }
    
    // For production: Allow configured origins
    const allowedOrigins = process.env.CHROME_EXTENSION_URL ?
      process.env.CHROME_EXTENSION_URL.split(',') : [];
      
    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Version', 'X-Client-ID', 'X-CSRF-Token', 'Stripe-Signature', 'X-Authorization', 'X-Forwarded-Authorization'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag', 'X-New-Token'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Special middleware to handle OPTIONS requests for preflight
app.options('*', cors());
*/

// Special middleware to add CORS headers to every response
app.use((req: Request, res: Response, next: NextFunction) => {
  // Set hardcoded CORS headers for Chrome extension
  res.setHeader('Access-Control-Allow-Origin', 'chrome-extension://kdmdhielhebecglcnejeakebepepiogf');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,X-Client-Version,X-Client-ID,X-CSRF-Token,Stripe-Signature,X-Authorization,X-Forwarded-Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
});

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

// Middleware to restore auth headers if needed
app.use((req: Request, res: Response, next: NextFunction) => {
  // If authorization header is missing but alternate headers exist, restore it
  if (!req.headers.authorization) {
    const altAuth = req.headers['x-authorization'] || req.headers['x-forwarded-authorization'];
    if (altAuth) {
      console.log('Express app - Restoring authorization header from alternate header');
      req.headers.authorization = Array.isArray(altAuth) ? altAuth[0] : altAuth;
    }
  }
  next();
});

// Routes - In serverless mode with URL rewriting, mount at root
console.log('Express app - Mounting API routes');
app.use('/', router);

// Add final 404 handler
app.use((req: Request, res: Response) => {
  console.log(`Express app - 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Not Found' });
});

// Add startup logging
console.log(`Server configured and ready to start`);

export default app; 