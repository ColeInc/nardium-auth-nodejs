import { EncryptionService } from '../../utils/encryption';
import { EncryptedToken } from '../../types/auth';

export class TokenService {
  private tokenStore: Map<string, EncryptedToken>;
  private encryptionService: EncryptionService;

  constructor() {
    this.tokenStore = new Map();
    this.encryptionService = new EncryptionService();
  }

  // ... rest of the service methods
} 