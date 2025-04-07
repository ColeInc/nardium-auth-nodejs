import app from './app';
import { env } from './utils/env';

// Only start the server if this file is run directly (not imported)
if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`Server running in development mode on port ${env.PORT}`);
  });
}

export default app; 