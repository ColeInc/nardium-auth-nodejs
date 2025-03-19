import { Request, Response } from 'express';
import { DocumentService } from '../document-service';

export class DocumentsController {
  static async recordAccess(req: Request, res: Response) {
    try {
      const { documentId, documentTitle } = req.body;
      const userId = req.user?.user_id;

      if (!userId || !documentId || !documentTitle) {
        return res.status(400).json({ 
          error: 'Missing required fields: documentId and documentTitle are required' 
        });
      }

      // Get user status to check document limits
      const userStatus = await DocumentService.getUserStatus(userId);
      
      if (userStatus.subscription_tier === 'free' && userStatus.remaining_documents <= 0) {
        return res.status(403).json({
          error: 'Free tier document limit reached',
          userStatus
        });
      }

      const documentAccess = await DocumentService.recordAccess(
        userId,
        documentId,
        documentTitle
      );

      res.json({ documentAccess, userStatus });
    } catch (error) {
      console.error('Error recording document access:', error);
      res.status(500).json({ error: 'Failed to record document access' });
    }
  }

  static async getUserDocuments(req: Request, res: Response) {
    try {
      const userId = req.user?.user_id;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const documents = await DocumentService.getUserDocuments(userId);
      res.json({ documents });
    } catch (error) {
      console.error('Error fetching user documents:', error);
      res.status(500).json({ error: 'Failed to fetch user documents' });
    }
  }

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