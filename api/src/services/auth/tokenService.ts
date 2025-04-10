import { EncryptionService } from '../../utils/encryption';
import { EncryptedToken } from '../../types/auth';
import { supabaseAdmin } from '../../supabase-client';

export class TokenService {
  private encryptionService: EncryptionService;

  constructor() {
    console.log('[TokenService] Initializing TokenService');
    this.encryptionService = new EncryptionService();
  }

  async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    console.log(`[TokenService:storeRefreshToken] Storing refresh token for user ${userId}`);
    console.log(`[TokenService:storeRefreshToken] Token length: ${refreshToken.length}`);

    try {
      const encryptedToken = this.encryptionService.encrypt(refreshToken);
      console.log('[TokenService:storeRefreshToken] Token encrypted successfully');

      console.log('[TokenService:storeRefreshToken] Updating token in Supabase');
      const { error } = await supabaseAdmin
        .from('users')
        .update({ refresh_token: JSON.stringify(encryptedToken) })
        .eq('id', userId);

      if (error) {
        console.error('[TokenService:storeRefreshToken] Supabase error:', error);
        throw error;
      }

      console.log('[TokenService:storeRefreshToken] Token stored successfully');
    } catch (err) {
      console.error('[TokenService:storeRefreshToken] Error storing token:', err);
      throw err;
    }
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    console.log(`[TokenService:getRefreshToken] Getting refresh token for user ${userId}`);

    try {
      console.log('[TokenService:getRefreshToken] Querying Supabase');
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('refresh_token')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[TokenService:getRefreshToken] Supabase error:', error);
        throw error;
      }

      if (!data?.refresh_token) {
        console.log('[TokenService:getRefreshToken] No refresh token found for user');
        return null;
      }

      console.log('[TokenService:getRefreshToken] Token found, parsing JSON');
      const encryptedToken: EncryptedToken = JSON.parse(data.refresh_token);

      console.log('[TokenService:getRefreshToken] Decrypting token');
      const decryptedToken = this.encryptionService.decrypt(encryptedToken);
      console.log(`[TokenService:getRefreshToken] Token decrypted successfully, length: ${decryptedToken.length}`);

      return decryptedToken;
    } catch (err) {
      console.error('[TokenService:getRefreshToken] Error retrieving token:', err);
      throw err;
    }
  }

  // ... rest of the service methods
} 