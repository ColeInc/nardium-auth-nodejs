import app from './src/app';
import { env } from './src/utils/env';
import { initializeResources } from './src/lib/initialization';

// Initialize resources on startup
initializeResources().catch(err => {
  console.error('Failed to initialize resources:', err);
});

// Use the same handler logic for both development and production
console.log(`Running in ${env.NODE_ENV} mode`);

if (env.NODE_ENV !== 'production') {
  // In development with vercel dev, this will still be used
  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
}

// Export the app for serverless use
export default app; 