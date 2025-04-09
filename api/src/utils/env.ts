import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the appropriate .env file
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
dotenv.config({ path: path.resolve(__dirname, '../../', envFile) });

// Fallback to regular .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Environment variables interface
export interface EnvVariables {
    NODE_ENV: string;
    PORT: number;
    CHROME_EXTENSION_URL: string;
    [key: string]: string | number | undefined;
}

// Parse environment variables with proper typing
export const env: EnvVariables = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    CHROME_EXTENSION_URL: process.env.CHROME_EXTENSION_URL || 'http://localhost:3000'
};

// Log the environment variables when they're first loaded
console.log(`Environment loaded: ${env.NODE_ENV} mode`);
console.log(`Server port: ${env.PORT}`);
console.log(`Chrome extension URL: ${env.CHROME_EXTENSION_URL}`);

// Helper function to get environment variables with proper typing
export function getEnvVar<T>(key: string, defaultValue: T): T {
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    return value as T;
} 