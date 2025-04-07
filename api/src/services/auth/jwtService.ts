import jwt, { Secret } from 'jsonwebtoken';
import { JWTPayload } from '../../types';
import crypto from 'crypto';

export class JWTService {
  private readonly JWT_SECRET: Secret;
  private readonly JWT_EXPIRY: string;
  private readonly REFRESH_THRESHOLD: number = 60 * 60; // 1 hour in seconds
  private readonly NONCE_SECRET: Buffer;
  private readonly IV_LENGTH = 16;

  constructor() {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET must be defined');
    }
    if (!process.env.NONCE_SECRET) {
      throw new Error('NONCE_SECRET must be defined');
    }
    this.JWT_SECRET = process.env.JWT_SECRET;
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

    // Hash the NONCE_SECRET to ensure it's always 32 bytes
    this.NONCE_SECRET = crypto
      .createHash('sha256')
      .update(process.env.NONCE_SECRET)
      .digest();
  }

  private encryptNonce(dataObj: any): string {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.NONCE_SECRET, iv);
    const dataString = JSON.stringify(dataObj);
    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptNonce(encrypted: string): any {
    try {
      const [ivHex, encryptedHex] = encrypted.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const encryptedText = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', this.NONCE_SECRET, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      const result = JSON.parse(decrypted.toString('utf8'));
      console.log('Successfully decrypted nonce');
      return result;
    } catch (error) {
      console.error('Failed to decrypt nonce:', error);
      throw new Error('Nonce decryption failed');
    }
  }

  public createSessionToken(payload: { user_id: string; email: string; sessionId: string; subscription_tier?: string }): string {
    const nonceData = {
      user_id: payload.user_id,
      sessionId: payload.sessionId,
      subscription_tier: payload.subscription_tier,
      timestamp: Date.now()
    };

    const encryptedNonce = this.encryptNonce(nonceData);

    const jwtPayload = {
      user_id: payload.user_id,
      email: payload.email,
      nonce: encryptedNonce
    };

    return jwt.sign(jwtPayload, this.JWT_SECRET, { expiresIn: '24h' });
  }

  public verifyToken(token: string): JWTPayload {
    try {
      console.log('Verifying JWT token:', token);
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      // Decrypt and verify nonce
      const nonceData = this.decryptNonce(decoded.nonce);

      // Validate nonce integrity
      if (nonceData.user_id !== decoded.user_id) {
        throw new Error('Invalid nonce integrity');
      }

      // Check nonce timestamp (optional: you can add max age validation)
      const nonceAge = Date.now() - nonceData.timestamp;
      if (nonceAge > 24 * 60 * 60 * 1000) { // 24 hours in milliseconds
        throw new Error('Nonce expired');
      }

      // Return combined data from JWT and nonce
      return {
        user_id: decoded.user_id,
        email: decoded.email,
        sessionId: nonceData.sessionId,
        subscription_tier: nonceData.subscription_tier
      };
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