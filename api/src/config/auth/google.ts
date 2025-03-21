import dotenv from 'dotenv';

dotenv.config();

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