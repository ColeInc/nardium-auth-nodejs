import { Request, Response, NextFunction } from 'express';

export const validateApiRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const clientId = req.headers['x-client-id'];
    if (!clientId || clientId !== process.env.EXPECTED_CLIENT_ID) {
      res.status(403).json({ error: 'Invalid client ID' });
      return;
    }

    if (!req.session?.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
}; 