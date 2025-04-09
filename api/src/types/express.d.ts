import { JWTPayload } from '../types';

// Correctly augment Express Request
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
} 