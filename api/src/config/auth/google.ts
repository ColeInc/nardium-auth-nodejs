import dotenv from 'dotenv';

// Force load environment variables at the start of this file
dotenv.config();

// Add debugging to see what's being loaded
console.log('Environment variables check:', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
});

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
  throw new Error(
    'Missing required Google OAuth configuration. Please check your .env file for:\n' +
    '- GOOGLE_CLIENT_ID\n' +
    '- GOOGLE_CLIENT_SECRET\n' +
    '- GOOGLE_REDIRECT_URI'
  );
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export const googleConfig: GoogleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: process.env.GOOGLE_REDIRECT_URI,
  scopes: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ]
}; 