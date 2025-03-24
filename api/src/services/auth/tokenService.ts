import { EncryptionService } from '../../utils/encryption';
import { EncryptedToken } from '../../types/auth';

export class TokenService {
  private tokenStore: Map<string, EncryptedToken>;
  private encryptionService: EncryptionService;

  constructor() {
    this.tokenStore = new Map();
    this.encryptionService = new EncryptionService();
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const encryptedToken = this.encryptionService.encrypt(refreshToken);
    this.tokenStore.set(userId, encryptedToken);
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const encryptedToken = this.tokenStore.get(userId);
    if (!encryptedToken) {
      return null;
    }
    return this.encryptionService.decrypt(encryptedToken);
  }

  // ... rest of the service methods
} 