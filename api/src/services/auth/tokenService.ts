import { EncryptionService } from '../../utils/encryption';
import { EncryptedToken } from '../../types/auth';
import { supabaseAdmin } from '../../supabase-client';

export class TokenService {
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const encryptedToken = this.encryptionService.encrypt(refreshToken);
    const { error } = await supabaseAdmin
      .from('users')
      .update({ refresh_token: JSON.stringify(encryptedToken) })
      .eq('id', userId);
    
    if (error) throw error;
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('refresh_token')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    if (!data?.refresh_token) return null;

    const encryptedToken: EncryptedToken = JSON.parse(data.refresh_token);
    return this.encryptionService.decrypt(encryptedToken);
  }

  // ... rest of the service methods
} 