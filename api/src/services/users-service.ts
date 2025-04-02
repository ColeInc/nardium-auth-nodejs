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
    tier: 'free' | 'premium' | 'subscriber'
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