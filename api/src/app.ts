import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DocumentsController } from './controllers/documents-controller';
import { UsersController } from './controllers/users-controller';
import { authenticateToken } from './auth-middleware';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy' });
});

// Protected routes
app.use('/api', authenticateToken);

// Document routes
app.post('/api/documents/access', (req: Request, res: Response) => DocumentsController.recordAccess(req, res));
app.get('/api/documents', (req: Request, res: Response) => DocumentsController.getUserDocuments(req, res));

// User routes
app.get('/api/user/status', (req: Request, res: Response) => UsersController.getUserStatus(req, res));
app.post('/api/user/upgrade', (req: Request, res: Response) => UsersController.upgradeUser(req, res));

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

export default app; 