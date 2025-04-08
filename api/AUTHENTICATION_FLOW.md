# Nardium Authentication Flow

This document explains the complete authentication flow for the Nardium Google Docs Outline Tool, including the division of responsibilities between frontend and backend components.

## Overview

The authentication flow uses OAuth 2.0 with Google, following a code exchange pattern that eliminates the need for server-side state storage. This approach is fully compatible with serverless architecture.

## Complete Authentication Flow

### Step 1: Frontend Initiates Google OAuth
- **Location:** Chrome Extension (Frontend)
- **Description:** 
  - User clicks "Login with Google" button
  - Frontend creates a random state token for CSRF protection
  - Frontend stores state token in local storage
  - Frontend opens a popup window with Google's authorization URL, including:
    - `client_id`: Public Google OAuth client ID
    - `redirect_uri`: Frontend callback URL
    - `state`: The generated state token
    - `response_type`: "code"
    - `scope`: Required Google API scopes

### Step 2: User Authenticates with Google
- **Location:** Google's Authentication Servers
- **Description:**
  - User logs in to their Google account (if not already logged in)
  - User grants permissions for the requested scopes
  - Google validates the request and redirect URI

### Step 3: Google Redirects Back to Frontend
- **Location:** Chrome Extension (Frontend)
- **Description:**
  - Google redirects to the frontend's callback URL with:
    - `code`: The authorization code
    - `state`: The same state token sent in Step 1
  - Frontend verifies the state token matches what was stored
  - Frontend closes the popup window
  - Frontend securely sends the authorization code to the backend

### Step 4: Backend Exchanges Code for Tokens
- **Location:** Nardium Node.js API (Backend)
- **Description:**
  - Backend receives the authorization code from frontend
  - Backend calls Google's token endpoint with:
    - `code`: The authorization code
    - `client_id`: Public Google OAuth client ID
    - `client_secret`: Private Google OAuth client secret
    - `redirect_uri`: Same redirect URI used in frontend
    - `grant_type`: "authorization_code"
  - Google validates the request and returns:
    - `access_token`: Short-lived token for API access
    - `refresh_token`: Long-lived token for getting new access tokens
    - `id_token`: JWT containing user identity information
    - `expires_in`: Token lifetime in seconds

### Step 5: Backend Verifies and Stores User Data
- **Location:** Nardium Node.js API (Backend)
- **Description:**
  - Backend verifies the `id_token` to extract user information
  - Backend encrypts the refresh token for security
  - Backend stores/updates user data in Supabase database:
    - Email
    - Google ID
    - Encrypted refresh token
    - Subscription tier
  - Backend creates a JWT session token with:
    - User ID
    - Email
    - Session ID
    - Subscription tier

### Step 6: Backend Returns Session Token to Frontend
- **Location:** Nardium Node.js API (Backend) → Chrome Extension (Frontend)
- **Description:**
  - Backend sends JWT session token to frontend
  - Frontend stores JWT session token securely
  - Frontend updates UI to show logged-in state

### Step 7: Subsequent API Requests
- **Location:** Chrome Extension (Frontend) → Nardium Node.js API (Backend)
- **Description:**
  - Frontend includes JWT session token in Authorization header
  - Backend validates JWT token signature and expiry
  - Backend grants access to protected resources based on user permissions

### Step 8: Token Refresh Flow
- **Location:** Chrome Extension (Frontend) → Nardium Node.js API (Backend)
- **Description:**
  - When Google access token expires, frontend calls backend's refresh endpoint
  - Backend retrieves encrypted refresh token from database
  - Backend exchanges refresh token for new access token with Google
  - Backend returns new access token to frontend

## Why No Server-Side State Storage Is Needed

The Nardium authentication flow doesn't require server-side state storage for several key reasons:

1. **Frontend Handles Initial OAuth State**
   - The state parameter for CSRF protection is generated, stored, and validated entirely in the frontend
   - The backend never sees or needs to validate this state parameter

2. **Single-Request Code Exchange**
   - The backend's role is limited to a single atomic operation: exchanging the authorization code for tokens
   - This operation happens in a single request, with no need to maintain state between requests

3. **JWT for Session Management**
   - After authentication, user sessions are managed using JWT tokens
   - JWTs are stateless by design, containing all necessary information in the token itself
   - The backend can verify the JWT without database lookups (except for additional security validation)

4. **Database for Persistent Data, Not State**
   - The database stores user profiles and refresh tokens for long-term persistence
   - This is different from "state" which refers to temporary data needed between requests in a flow
   - User data storage would be needed regardless of the authentication method

## Serverless Compatibility

This authentication flow is well-suited for serverless environments because:

1. **No Cross-Request State Dependencies**
   - Each request to the backend is self-contained with all the information needed to process it
   - Different requests can be handled by different serverless function instances

2. **Database Usage Is Limited to Persistence**
   - Database interactions are only for storing/retrieving persistent data
   - No temporary session or state data needs to be stored in the database

3. **Stateless JWT Validation**
   - JWT tokens can be validated without database lookups
   - Each serverless function instance can validate tokens independently

## Security Considerations

While this flow minimizes state requirements, it incorporates several security best practices:

1. **Frontend CSRF Protection**
   - The state parameter in the frontend OAuth flow prevents cross-site request forgery
   
2. **Secure Token Storage**
   - Refresh tokens are encrypted before storage in the database
   
3. **JWT with Encrypted Nonce**
   - Session tokens include an encrypted nonce for additional security
   
4. **Client Validation**
   - API requests validate the client ID in addition to the JWT

5. **Short-Lived Tokens**
   - JWTs have limited lifetime with built-in expiration
   
6. **Secure Cookie Settings**
   - HTTP-only, secure, and SameSite cookie settings when used 