import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

// Helper function to get environment variables with proper typing
export function getEnvVar<T>(key: string, defaultValue: T): T {
    const value = process.env[key];
    if (value === undefined) {
        return defaultValue;
    }
    return value as T;
} 