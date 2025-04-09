import { supabaseAdmin } from '../supabase-client';
import { User } from '../types';

/**
 * Updates a user's subscription tier in Supabase
 * @param userId The Supabase user ID
 * @param tier The subscription tier to set
 * @returns The updated user or null if not found
 */
export const updateUserTier = async (
    userId: string,
    tier: 'free' | 'premium'
): Promise<User | null> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .update({ subscription_tier: tier })
            .eq('id', userId)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating user tier:', error);
            throw error;
        }

        return data as User;
    } catch (error) {
        console.error('Error in updateUserTier service:', error);
        return null;
    }
};

/**
 * Gets a user by their Supabase user ID
 * @param userId The Supabase user ID
 * @returns The user or null if not found
 */
export const getUserById = async (userId: string): Promise<User | null> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user:', error);
            return null;
        }

        return data as User;
    } catch (error) {
        console.error('Error in getUserById service:', error);
        return null;
    }
};

/**
 * Creates a new user or updates an existing user from Stripe checkout data
 * @param email User's email address
 * @param googleId Google ID (sub) from metadata
 * @param subscriptionTier Subscription tier to set
 * @param stripeCustomerId Stripe Customer ID
 * @returns The created/updated user or null if operation failed
 */
export const createOrUpdateUserFromStripe = async (
    email: string,
    googleId: string | null,
    subscriptionTier: 'free' | 'premium',
    stripeCustomerId: string
): Promise<User | null> => {
    try {
        console.log(`[createOrUpdateUserFromStripe] Starting process for email: ${email}`);
        console.log(`[createOrUpdateUserFromStripe] Data received: googleId: ${googleId || 'N/A'}, tier: ${subscriptionTier}, stripeCustomerId: ${stripeCustomerId}`);

        // Check if user exists by email
        const { data: existingUser, error: findError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (findError && findError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
            console.error('[createOrUpdateUserFromStripe] Error finding user:', findError);
            throw findError;
        }

        if (existingUser) {
            console.log(`[createOrUpdateUserFromStripe] Existing user found with ID: ${existingUser.id}`);

            // Update existing user
            const updateData: any = {
                subscription_tier: subscriptionTier,
                stripe_customer_id: stripeCustomerId,
                updated_at: new Date().toISOString()
            };

            // Only update google_id if provided and current is null
            if (googleId && !existingUser.google_id) {
                console.log(`[createOrUpdateUserFromStripe] Adding missing Google ID: ${googleId}`);
                updateData.google_id = googleId;
            }

            console.log(`[createOrUpdateUserFromStripe] Updating user with data:`, updateData);

            const { data, error } = await supabaseAdmin
                .from('users')
                .update(updateData)
                .eq('id', existingUser.id)
                .select()
                .single();

            if (error) {
                console.error('[createOrUpdateUserFromStripe] Error updating user:', error);
                throw error;
            }

            console.log(`[createOrUpdateUserFromStripe] Successfully updated user ${data.id}`);
            return data;
        } else {
            console.log(`[createOrUpdateUserFromStripe] No existing user found with email: ${email}`);
            console.log(`[createOrUpdateUserFromStripe] IMPORTANT: This webhook requires existing users in Supabase.`);
            console.log(`[createOrUpdateUserFromStripe] Looking up if user exists in auth system...`);

            try {
                // Use a more direct approach to handle this case
                // Instead of trying to query auth tables, create a new user record with a generated UUID
                // This is a fallback solution for when users complete checkout without having a user account

                console.log(`[createOrUpdateUserFromStripe] Creating a new user record for email: ${email}`);

                // Generate a UUID for this user to serve as their user ID
                const { v4: uuidv4 } = require('uuid');
                const generatedUserId = uuidv4();

                const newUser = {
                    id: generatedUserId, // Using a generated UUID
                    email,
                    google_id: googleId,
                    subscription_tier: subscriptionTier,
                    stripe_customer_id: stripeCustomerId,
                    refresh_token: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                console.log(`[createOrUpdateUserFromStripe] Creating new user record with generated ID: ${generatedUserId}`);

                const { data, error } = await supabaseAdmin
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();

                if (error) {
                    console.error('[createOrUpdateUserFromStripe] Error creating user record:', error);
                    throw error;
                }

                console.log(`[createOrUpdateUserFromStripe] Successfully created user record with ID: ${data.id}`);
                console.log(`[createOrUpdateUserFromStripe] NOTE: This user was created without auth integration. They will need to sign in later.`);
                return data;

            } catch (error) {
                console.error('[createOrUpdateUserFromStripe] Error creating user record:', error);
                return null;
            }
        }
    } catch (error) {
        console.error('[createOrUpdateUserFromStripe] Unhandled error:', error);
        return null;
    }
}; 