import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { JWTPayload } from '../../types';

export class JWTService {
  private readonly JWT_SECRET: Secret;
  private readonly JWT_EXPIRY: number | string;
  private readonly REFRESH_THRESHOLD: number = 60 * 60; // 1 hour in seconds

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be defined');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
  }

  public createSessionToken(payload: Omit<JWTPayload, 'subscription_tier'> & { sessionId: string }): string {
    const options: SignOptions = {
      expiresIn: '24h' as const,
    };
    return jwt.sign(payload, this.JWT_SECRET, options);
  }

  public verifyToken(token: string): JWTPayload & { sessionId: string } {
    try {
      console.log('Verifying JWT token:', token);
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload & { sessionId: string };
    } catch (error) {
      console.log('JWT verification failed. Token:', token);
      throw new Error('Invalid token');
    }
  }

  public refreshTokenIfNeeded(token: string): string | null {
    try {
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded.payload === 'string' || !decoded.payload.exp) {
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.payload.exp - now;

      // If token is close to expiry (within REFRESH_THRESHOLD), create a new one
      if (timeUntilExpiry < this.REFRESH_THRESHOLD) {
        const payload = this.verifyToken(token);
        return this.createSessionToken(payload);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  public getCookieConfig(isProd: boolean = process.env.NODE_ENV === 'production') {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    } as const;
  }
} 