import app from './src/app';
import { env } from './src/utils/env';

// Dual-mode execution setup
if (env.NODE_ENV === 'production') {
  // In production, log that we're running in serverless mode
  console.log('Running in production mode (serverless)');
} else {
  // In development, start the Express server
  console.log('Running in development mode (local server)');
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

// Export the app for both development and production
export default app; 