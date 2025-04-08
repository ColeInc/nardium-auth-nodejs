import { SupabaseClient } from '@supabase/supabase-js';
import { GoogleAuthService } from '../services/auth/googleAuthService';
import { TokenService } from '../services/auth/tokenService';
import { SupabaseAuthService } from '../services/auth/supabaseAuthService';
import { JWTService } from '../services/auth/jwtService';
import { EncryptionService } from '../utils/encryption';
import Stripe from 'stripe';
import { getSupabaseClient, getSupabaseAdminClient } from '../supabase-client';

// Declare resource container
interface Resources {
    supabase: SupabaseClient | null;
    supabaseAdmin: SupabaseClient | null;
    googleAuthService: GoogleAuthService | null;
    tokenService: TokenService | null;
    supabaseAuthService: SupabaseAuthService | null;
    jwtService: JWTService | null;
    encryptionService: EncryptionService | null;
    stripeClient: Stripe | null;
}

// Track initialization state
let isInitialized = false;

// Resource container
const resources: Resources = {
    supabase: null,
    supabaseAdmin: null,
    googleAuthService: null,
    tokenService: null,
    supabaseAuthService: null,
    jwtService: null,
    encryptionService: null,
    stripeClient: null
};

/**
 * Create Stripe client
 */
function createStripeClient(): Stripe {
    console.log('Creating Stripe client...');
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

    if (!stripeSecretKey) {
        throw new Error('Missing Stripe secret key. Please check your environment variables.');
    }

    return new Stripe(stripeSecretKey, {
        // Using the required API version based on type definition
        apiVersion: '2025-03-31.basil',
        // Optimize for serverless environment
        httpClient: Stripe.createFetchHttpClient(),
        timeout: 5000, // 5 second timeout for API calls
    });
}

/**
 * Initialize resources based on environment
 */
export function initialize() {
    console.log('Initializing resources...');

    if (process.env.NODE_ENV === 'development') {
        if (!resources.supabase) {
            resources.supabase = getSupabaseClient();
        }

        if (!resources.supabaseAdmin) {
            resources.supabaseAdmin = getSupabaseAdminClient();
        }

        if (!resources.stripeClient) {
            resources.stripeClient = createStripeClient();
        }
    }

    // For production, initialize resources on first use
    return resources;
}

/**
 * Get Supabase client (creates or returns existing instance)
 */
export function getSupabase(): SupabaseClient {
    if (!resources.supabase) {
        resources.supabase = getSupabaseClient();
    }
    return resources.supabase;
}

/**
 * Get Supabase Admin client (creates or returns existing instance)
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (!resources.supabaseAdmin) {
        resources.supabaseAdmin = getSupabaseAdminClient();
    }
    return resources.supabaseAdmin;
}

/**
 * Initialize all resources, reusing existing ones if available
 */
export async function initializeResources(): Promise<Resources> {
    // Special case for development mode
    if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode: Initializing resources once...');
    } else {
        console.log('Production mode: Checking resource initialization status...');
    }

    // If already initialized, return the resources
    if (isInitialized) {
        console.log('Resources already initialized, reusing...');
        return resources;
    }

    console.log('Initializing resources...');

    try {
        // Initialize encryption service first (needed by other services)
        resources.encryptionService = new EncryptionService();

        // Use singleton Supabase clients
        resources.supabase = getSupabaseClient();
        resources.supabaseAdmin = getSupabaseAdminClient();
        resources.stripeClient = createStripeClient();

        // Initialize services (in dependency order)
        resources.jwtService = new JWTService();
        resources.tokenService = new TokenService();
        resources.googleAuthService = new GoogleAuthService(resources.encryptionService);
        resources.supabaseAuthService = new SupabaseAuthService(resources.encryptionService);

        // Mark as initialized
        isInitialized = true;
        console.log('Resources initialized successfully');

        return resources;
    } catch (error) {
        console.error('Failed to initialize resources:', error);
        throw error;
    }
}

/**
 * Get resources - will throw if not initialized
 * Use this when you're sure initialization has happened
 */
export function getResources(): Resources {
    if (!isInitialized) {
        throw new Error('Resources accessed before initialization');
    }
    return resources;
}

/**
 * Get initialized resources or initialize them if needed
 * Use this when you're not sure if initialization has happened
 */
export async function getOrInitResources(): Promise<Resources> {
    if (!isInitialized) {
        return initializeResources();
    }
    return resources;
} 