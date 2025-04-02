import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import router from './routes';
import dotenv from 'dotenv';

dotenv.config();

declare module 'express-session' {
  interface SessionData {
    userId: string;
    email: string;
  }
}

const app: Express = express();

// Security middleware configuration
app.use(helmet());

// Body parser middleware is handled in routes/index.ts
// to properly handle Stripe webhooks that need raw body data

// Cookie parser middleware
app.use(cookieParser());

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CHROME_EXTENSION_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Client-Version', 'X-Client-ID', 'X-CSRF-Token', 'Stripe-Signature'],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag']
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// CSRF protection
// app.use(csrf({ cookie: true }));

// Routes
app.use('/api', router);

// Add startup logging
console.log(`Server configured and ready to start`);

export default app; 