import { Router } from 'express';
import { documentsController } from '../controllers/documents-controller';
import { validateApiRequest } from '../middleware/security/apiAuth';
import express from 'express';

const router = Router();

// Add logging middleware for document routes
router.use((req, res, next) => {
    console.log(`Document route accessed: ${req.method} ${req.path}`);
    next();
});

// Apply JSON parsing middleware
router.use(express.json());

// Document routes - all require authentication
router.post('/access', validateApiRequest, documentsController.checkDocumentAccess);
router.get('/list', validateApiRequest, documentsController.getUserDocuments);
router.get('/status', validateApiRequest, documentsController.getUserStatus);

export default router; 