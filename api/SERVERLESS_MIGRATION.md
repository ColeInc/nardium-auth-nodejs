# Serverless Migration Guide

This document explains the changes made to optimize the Nardium Auth Node.js API for serverless deployment while maintaining the dual-mode (development/production) setup.

## Key Changes

### 1. Centralized Resource Initialization

We've implemented a centralized resource initialization system in `src/lib/initialization.ts` that:

- Creates and maintains singleton instances of all services
- Manages connection pooling for database clients
- Reuses resources between serverless function invocations
- Handles environment-specific initialization

### 2. Optimized Connection Management

The application is optimized for stateless operation:

- User data and tokens stored in Supabase for persistence
- JWT-based authentication instead of session cookies
- No unnecessary temporary state storage

### 3. Optimized Controller Pattern

Controllers have been refactored from class instances to direct function exports:

- Removed service initialization in controllers
- Controllers now access services via the centralized resource module
- Reduced duplicate initialization overhead

### 4. Serverless Handler Optimization

The serverless handler in `functions/index.ts` has been optimized with:

- Pre-initialization on module load
- Proper error handling and timeouts
- Performance tracking
- Support for warm-up requests

### 5. Connection Pooling

Database connections are now properly pooled:

- Supabase clients use connection pooling configuration
- Connections are reused between function invocations
- Connection state is properly managed

## Required Database Changes

No additional database tables are required beyond what already exists in your schema. The authentication flow is designed to work without temporary state storage.

## Vercel Configuration

The `vercel.json` file has been updated with:

- Increased memory allocation (1024 MB)
- Explicit function timeout settings
- Warm-up configuration via CRON jobs

## Dual-Mode Operation

The application continues to support dual-mode operation:

### Development Mode

```bash
npm run dev
```

This runs the traditional Express server from `src/server.ts` and maintains all existing development workflows.

### Production Mode

In production, the application operates as serverless functions through `functions/index.ts`, benefiting from all the optimizations described above.

## Testing

To test the serverless deployment locally:

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Run the serverless function locally:
   ```bash
   vercel dev
   ```

## Migration Checklist

- [ ] Update environment variables in Vercel
- [ ] Deploy code changes
- [ ] Verify Google OAuth flow in production
- [ ] Monitor performance and resource usage
- [ ] Set up monitoring for serverless function invocations

## Additional Resources

- [Vercel Serverless Functions Documentation](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Express with Serverless](https://github.com/vendia/serverless-express) 