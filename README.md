# Nardium Auth Node.js API

This is the authentication backend for the Nardium Google Docs Outline Tool.

## Project Structure

The project follows a serverless-first approach:

- **Development Mode**: Runs using `vercel dev` which provides a local development environment that mimics the production Vercel serverless environment
- **Production Mode**: Deploys as serverless functions on Vercel

## Directory Structure

```
/api                   # API code (main directory)
├── functions/         # Serverless function handlers for Vercel
│   └── index.ts       # Main serverless handler
├── src/               # Source code
│   ├── app.ts         # Express app configuration
│   ├── lib/           # Core functionality libraries
│   ├── controllers/   # Business logic
│   ├── middleware/    # Express middleware
│   ├── routes/        # API routes
│   ├── types/         # TypeScript type definitions 
│   └── utils/         # Utility functions
├── index.ts           # App entry point
├── scripts/           # Utility scripts
│   └── setup-vercel-dev.js # Vercel Dev setup script
├── .env.development   # Development environment variables
├── .env.production    # Production environment variables (not in git)
├── vercel.json        # Vercel configuration
└── package.json       # API dependencies and scripts
```

## Development

### Initial Setup

If this is your first time running the project with Vercel Dev:

1. Navigate to the API directory:
   ```bash
   cd api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the setup script:
   ```bash
   npm run setup
   ```

### Running the Development Server

To run the server locally using Vercel Dev:

```bash
cd api
npm run dev
```

This will start the Vercel Dev server which simulates the serverless environment locally.

When you run the development server for the first time, you will be prompted to link to a Vercel project. You can either:
- Link to an existing project
- Create a new project
- Continue without linking (choose "N" when asked to link)

## Production Deployment

To deploy to production:

```bash
cd api
vercel --prod
```

## Environment Variables

The setup script creates a `.env.development` file automatically. For production, create a `.env.production` file based on the provided `.env.production.example`.

Variables include:
- `NODE_ENV`: Set to 'development' for local development or 'production' for serverless deployment
- `PORT`: Local development port (default: 3000)
- `CHROME_EXTENSION_URL`: URL of the Chrome extension for CORS
- Plus all other service-specific variables (Google OAuth, Stripe, etc.)

## API Routes

- `/api/auth/google/callback`: Google OAuth callback
- `/api/auth/google/refresh-token`: Refresh Google access token
- `/api/auth/logout`: Logout user
- `/api/documents/access`: Check document access
- `/api/create-stripe-session`: Create Stripe checkout session
- `/api/stripe/webhook`: Stripe webhook handler
- `/api/health`: Health check endpoint

## Features

- JWT-based authentication
- Document access tracking
- Free/Premium tier management
- User subscription status
- Supabase integration for data storage

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Supabase account and project

## Environment Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp api/.env.example api/.env
   ```

2. Update the `.env` file with your configuration:
   ```
   PORT=3000
   NODE_ENV=development
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRATION=24h
   ALLOWED_ORIGINS=http://localhost:3000,https://your-production-domain.com
   ```

## Installation

1. Install dependencies:
   ```bash
   cd api
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on http://localhost:3000 (or the port specified in your .env file).

## API Endpoints

### Public Endpoints

- `GET /health` - Health check endpoint

### Protected Endpoints (Requires JWT Authentication)

- `POST /api/documents/access` - Record document access
- `GET /api/documents` - Get user's document list
- `GET /api/user/status` - Get user's subscription status

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer your_jwt_token
```

## Development

For development, use the following command to start the server with hot-reload:

```bash
npm run dev
```

## Production Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Database Schema

### Users Table
```sql
create table users (
  id uuid primary key,
  email text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  subscription_tier text default 'free'::text not null
);
```

### Document Access Table
```sql
create table document_access (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) not null,
  document_id text not null,
  first_accessed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_accessed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create index for faster lookups
create index document_access_user_id_idx on document_access(user_id);
create unique index document_access_user_document_idx on document_access(user_id, document_id);
```

## License

ISC
