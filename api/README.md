# Nardium Auth Node.js API

This is the authentication backend for the Nardium Google Docs Outline Tool.

## Project Structure

The project follows a dual-mode execution setup:

- **Development Mode**: Runs as a traditional Express server for local development
- **Production Mode**: Deploys as serverless functions on Vercel

## Directory Structure

```
/api
  ├── functions/           # Serverless function handlers for Vercel
  │   └── index.ts         # Main serverless handler
  ├── src/                 # Source code
  │   ├── app.ts           # Express app configuration
  │   ├── server.ts        # Development server entry point
  │   ├── controllers/     # Business logic
  │   ├── middleware/      # Express middleware
  │   ├── routes/          # API routes
  │   ├── types/           # TypeScript type definitions
  │   │   ├── index.ts     # Type exports
  │   │   └── api.ts       # API-specific types
  │   └── utils/           # Utility functions
  │       ├── env.ts       # Environment variable utilities
  │       └── apiResponse.ts # API response utilities
  ├── index.ts             # Dual-mode entry point
  ├── vercel.json          # Vercel configuration
  └── package.json         # Dependencies and scripts
```

## Development

To run the server locally:

```bash
npm run dev
```

This will start the Express server in development mode.

## Production Deployment

The project is configured for deployment on Vercel. When deployed, it will run in serverless mode.

## TypeScript Typing

The project uses TypeScript for type safety. Key type definitions include:

- `EnvVariables`: Environment variable types
- `ApiResponse<T>`: Generic API response type
- `MiddlewareFunction`: Express middleware function type
- `ControllerFunction`: Controller function type
- `ServerlessHandler`: Serverless function handler type
- `AuthenticatedRequest`: Request with user data

## Environment Variables

Create a `.env` file based on `.env.example` with the following variables:

- `NODE_ENV`: Set to 'development' for local development or 'production' for serverless deployment
- Other environment variables as specified in `.env.example`

## API Routes

- `/api/auth/google/callback`: Google OAuth callback
- `/api/auth/google/refresh-token`: Refresh Google access token
- `/api/auth/logout`: Logout user
- `/api/documents/access`: Check document access
- `/api/create-stripe-session`: Create Stripe checkout session
- `/api/stripe/webhook`: Stripe webhook handler 