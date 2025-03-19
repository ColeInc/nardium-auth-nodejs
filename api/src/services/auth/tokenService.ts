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

  // ... rest of the service methods
} 