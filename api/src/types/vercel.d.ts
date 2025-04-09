import { JWTPayload } from '../types';
import '@vercel/node';

declare module '@vercel/node' {
    interface VercelRequest {
        user?: JWTPayload;
    }
} 