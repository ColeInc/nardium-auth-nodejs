import { Request, Response } from 'express';
import { DocumentService } from '../document-service';

export class UsersController {
  static async getUserStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const userStatus = await DocumentService.getUserStatus(userId);
      res.json({ userStatus });
    } catch (error) {
      console.error('Error fetching user status:', error);
      res.status(500).json({ error: 'Failed to fetch user status' });
    }
  }

  static async upgradeUser(req: Request, res: Response) {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // In a real implementation, you would process payment here
      // For now, we'll just update the subscription tier

      const updatedUser = await DocumentService.upgradeUser(userId);
      const userStatus = await DocumentService.getUserStatus(userId);
      
      res.json({ 
        success: true, 
        message: 'Successfully upgraded to premium',
        user: updatedUser,
        userStatus
      });
    } catch (error) {
      console.error('Error upgrading user:', error);
      res.status(500).json({ error: 'Failed to upgrade user' });
    }
  }
} 