import { JWTService } from './jwtService';

// Create a singleton instance of the JWTService
let jwtServiceInstance: JWTService | null = null;

/**
 * Get or create the JWTService instance
 * This ensures we only create one instance per serverless function
 */
export function getJWTService(): JWTService {
    if (!jwtServiceInstance) {
        console.log('Initializing JWTService singleton');
        jwtServiceInstance = new JWTService();
    }
    return jwtServiceInstance;
} 