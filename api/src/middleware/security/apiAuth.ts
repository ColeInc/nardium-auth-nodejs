import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../../services/auth/jwtService';
import { JWTPayload } from '../../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload & { sessionId: string };
    }
  }
}

const jwtService = new JWTService();

/**
 * API Authentication Middleware
 * 
 * This middleware handles authentication for protected API routes by:
 * 1. Extracting the JWT token from the request cookies
 * 2. Decrypting and validating the token using the JWT_SECRET from .env
 * 3. If valid, attaches the user information to the request and allows it to proceed
 * 4. If invalid or expired, rejects the request with appropriate error responses
 * 
 * The middleware also validates the client ID and refreshes tokens when needed.
 */
export const validateApiRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    console.log('Validating API request...');
    
    // Validate client ID
    const clientId = req.headers['x-client-id'];
    if (!clientId || clientId !== process.env.EXPECTED_CLIENT_ID) {
      res.status(403).json({ error: 'Invalid client ID' });
      return;
    }

    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Bearer token required' });
      return;
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Invalid Bearer token format' });
      return;
    }

    try {
      // Verify JWT token
      const payload = jwtService.verifyToken(token);
      
      // Attach user info to request
      req.user = payload;
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    console.error('API auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 