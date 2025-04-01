import { Request, Response } from 'express';
import { DocumentService } from '../document-service';

export class DocumentsController {
  static async checkDocumentAccess(req: Request, res: Response) {
    console.log(`Starting checkDocumentAccess for document: ${req.body.documentId}`);
    try {
      const { documentId } = req.body;
      const userId = req.user?.user_id;

      if (!userId || !documentId) {
        console.log(`checkDocumentAccess failed: Missing required fields for document: ${documentId}`);
        return res.status(400).json({
          error: 'Missing required fields: documentId required!'
        });
      }

      // Get user status 
      const userStatus = await DocumentService.getUserStatus(userId);

      // Check if user has access to this document
      const accessCheck = await DocumentService.checkDocumentAccess(userId, documentId);

      // If the document is already in user's history or user has not reached limit, grant access
      if (accessCheck.hasAccess) {
        // Record the access
        const documentAccess = await DocumentService.recordAccess(
          userId,
          documentId,
        );

        console.log(`checkDocumentAccess succeeded for document: ${documentId}, user: ${userId}`);
        return res.json({ documentAccess, userStatus });
      }

      // If we get here, access is denied (free tier, not in history, and at limit)
      if (userStatus.subscription_tier === 'free') {
        console.log(`checkDocumentAccess failed: Free tier limit reached for user: ${userId}`);
        return res.status(403).json({
          error: 'Free tier document limit reached',
          userStatus
        });
      }

      // This should never happen since premium users always get access
      console.log(`Unexpected state in checkDocumentAccess for user: ${userId}`);
      res.status(500).json({ error: 'Unexpected error processing document access' });
    } catch (error) {
      console.error('Error recording document access:', error);
      console.log(`checkDocumentAccess failed with error for document: ${req.body.documentId}`);
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

export const documentsController = {
  checkDocumentAccess: DocumentsController.checkDocumentAccess,
  getUserDocuments: DocumentsController.getUserDocuments,
  getUserStatus: DocumentsController.getUserStatus,
  upgradeUser: DocumentsController.upgradeUser
}; 