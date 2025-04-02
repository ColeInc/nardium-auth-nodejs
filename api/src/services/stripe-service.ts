import Stripe from 'stripe';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../supabase-client';
import { updateUserTier } from './users-service';

dotenv.config();

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY in environment variables');
}

const stripe = new Stripe(stripeSecretKey);

// Create or retrieve a Stripe customer for the Supabase user
export const getOrCreateStripeCustomer = async (userId: string, email: string): Promise<string> => {
    try {
        // First, check if the user already has a Stripe customer ID in Supabase
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user from Supabase:', userError);
            throw new Error('Failed to fetch user data');
        }

        // If the user already has a Stripe customer ID, return it
        if (userData?.stripe_customer_id) {
            return userData.stripe_customer_id;
        }

        // Otherwise, create a new customer in Stripe
        const customer = await stripe.customers.create({
            email,
            metadata: {
                supabaseUserId: userId
            }
        });

        // Save the Stripe customer ID to the user's record in Supabase
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ stripe_customer_id: customer.id })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user with Stripe customer ID:', updateError);
            throw new Error('Failed to update user with Stripe customer ID');
        }

        return customer.id;
    } catch (error) {
        console.error('Error in getOrCreateStripeCustomer:', error);
        throw error;
    }
};

// Create a Stripe checkout session
export const createCheckoutSession = async (
    customerId: string,
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
): Promise<string> => {
    try {
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                supabaseUserId: userId
            }
        });

        return session.url || '';
    } catch (error) {
        console.error('Error creating checkout session:', error);
        throw error;
    }
};

// Verify and process the Stripe webhook
export const handleStripeWebhook = async (signature: string, payload: Buffer): Promise<void> => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        throw new Error('Missing STRIPE_WEBHOOK_SECRET in environment variables');
    }

    try {
        // Verify the webhook signature
        const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

        // Handle the specific events
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;

            // Extract the Supabase user ID from the metadata
            const userId = session.metadata?.supabaseUserId;

            if (!userId) {
                throw new Error('Missing supabaseUserId in session metadata');
            }

            // Update the user's tier in Supabase using the users service
            const updatedUser = await updateUserTier(userId, 'subscriber');

            if (!updatedUser) {
                throw new Error(`Failed to update user tier for user: ${userId}`);
            }

            console.log(`Updated tier to 'subscriber' for user: ${userId}`);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
    }
}; 