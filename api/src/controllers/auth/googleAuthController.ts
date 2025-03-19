import { Response } from 'express';
import { GoogleAuthService } from '../../services/auth/googleAuthService';
import { TokenService } from '../../services/auth/tokenService';
import { GoogleCallbackRequest } from '../../types/auth';

export class GoogleAuthController {
  private googleAuthService: GoogleAuthService;
  private tokenService: TokenService;

  constructor() {
    this.googleAuthService = new GoogleAuthService();
    this.tokenService = new TokenService();
  }

  public handleCallback = async (
    req: GoogleCallbackRequest,
    res: Response
  ): Promise<void> => {
    try {
      const { code } = req.body;
      
      if (!code) {
        res.status(400).json({ error: 'Authorization code is required' });
        return;
      }

      const tokens = await this.googleAuthService.exchangeAuthCode(code);
      const userData = await this.googleAuthService.verifyAndGetUserInfo(tokens.id_token);
      
      req.session.userId = userData.sub;
      req.session.email = userData.email;
      
      await this.tokenService.storeRefreshToken(userData.sub, tokens.refresh_token);

      res.json({ 
        success: true,
        csrfToken: req.csrfToken()
      });
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // ... rest of the controller methods
}

export const googleAuthController = new GoogleAuthController(); 