import Stripe from 'stripe';
import dotenv from 'dotenv';
import { supabaseAdmin } from '../supabase-client';
import { updateUserTier, createOrUpdateUserFromStripe } from './users-service';

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

        console.log(`Processing webhook event: ${event.type}`);

        // Handle specific events
        switch (event.type) {
            // Successful checkout completion
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;

                // Log the full session object for debugging - truncate sensitive data
                const sessionLog = JSON.parse(JSON.stringify(session));
                if (sessionLog.customer_details && sessionLog.customer_details.email) {
                    sessionLog.customer_details.email = sessionLog.customer_details.email.substring(0, 3) + '***';
                }
                if (sessionLog.customer) {
                    sessionLog.customer = String(sessionLog.customer).substring(0, 5) + '***';
                }

                console.log('[STRIPE_WEBHOOK] checkout.session.completed payload structure:',
                    JSON.stringify(sessionLog,
                        (key, value) => typeof value === 'string' && value.length > 100
                            ? value.substring(0, 100) + '...'
                            : value,
                        2
                    )
                );

                // Extract metadata from session
                const metadata = session.metadata || {};

                // Get customer email - try to get from multiple possible locations
                const email = metadata.email ||
                    (session.customer_details && session.customer_details.email) ||
                    null;

                const sub = metadata.sub;
                const subscriptionTier = metadata.subscription_tier || 'premium';
                const stripeCustomerId = session.customer as string;

                console.log('[STRIPE_WEBHOOK] Extracted data from session:');
                console.log(`  - Email: ${email || 'MISSING'}`);
                console.log(`  - Google ID (sub): ${sub || 'NOT PROVIDED'}`);
                console.log(`  - Subscription tier: ${subscriptionTier}`);
                console.log(`  - Stripe customer ID: ${stripeCustomerId || 'MISSING'}`);

                // Validate required fields
                if (!email) {
                    console.error('[STRIPE_WEBHOOK] Missing email in session or customer details');
                    throw new Error('Missing email in session metadata or customer details');
                }

                if (!stripeCustomerId) {
                    console.error('[STRIPE_WEBHOOK] Missing customer ID in session');
                    throw new Error('Missing customer ID in session');
                }

                // Create or update user in Supabase
                console.log('[STRIPE_WEBHOOK] Calling createOrUpdateUserFromStripe...');
                const user = await createOrUpdateUserFromStripe(
                    email,
                    sub || null,
                    subscriptionTier as 'free' | 'premium',
                    stripeCustomerId
                );

                if (!user) {
                    console.error(`[STRIPE_WEBHOOK] Failed to create or update user with email: ${email}`);
                    throw new Error(`Failed to create or update user with email: ${email}`);
                }

                console.log(`[STRIPE_WEBHOOK] Successfully processed checkout for user: ${user.id}`);

                // For backwards compatibility - if userId is in metadata, update tier with previous method too
                const userId = session.metadata?.supabaseUserId;
                if (userId) {
                    console.log(`[STRIPE_WEBHOOK] Also updating user tier for existing userId: ${userId}`);
                    await updateUserTier(userId, 'premium');
                }

                break;
            }

            // Handle subscription created
            case 'customer.subscription.created': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription, 'created');
                break;
            }

            // Handle subscription updated
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription, 'updated');
                break;
            }

            // Handle subscription cancelled/deleted
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionChange(subscription, 'deleted');
                break;
            }

            // Handle payment success
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as Stripe.Invoice;
                // Access subscription ID from raw event data to avoid TypeScript errors
                const rawInvoiceObject = event.data.object as any;
                if (rawInvoiceObject.subscription) {
                    const subscription = await stripe.subscriptions.retrieve(rawInvoiceObject.subscription);
                    await handleSuccessfulPayment(invoice, subscription);
                }
                break;
            }

            // Handle payment failures
            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                // Access invoice data safely
                const rawInvoiceObject = event.data.object as any;
                await handleFailedPayment(invoice, rawInvoiceObject);
                break;
            }

            case 'payment_intent.succeeded': {
                console.log("bing bong triggered payment_intent.succeeded!");
                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        throw error;
    }
};

/**
 * Handles subscription status changes
 */
const handleSubscriptionChange = async (
    subscription: Stripe.Subscription,
    changeType: 'created' | 'updated' | 'deleted'
): Promise<void> => {
    try {
        // Find the user associated with this subscription
        const customerId = subscription.customer as string;
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId);

        if (error || !users || users.length === 0) {
            console.error('Error finding user for subscription:', error || 'No user found');
            return;
        }

        const userId = users[0].id;

        // Handle based on subscription status
        let tier: 'free' | 'premium' = 'free';

        if (changeType === 'deleted' || subscription.status === 'canceled' || subscription.status === 'unpaid') {
            tier = 'free';
            console.log(`Downgrading user ${userId} to free tier due to subscription ${changeType}`);
        } else if (['active', 'trialing'].includes(subscription.status)) {
            tier = 'premium';
            console.log(`Setting user ${userId} to premium tier due to subscription ${changeType}`);
        }

        // Update the user tier
        await updateUserTier(userId, tier);

        // Store subscription info in your database if needed
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({
                subscription_id: subscription.id,
                subscription_status: subscription.status,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating subscription info:', updateError);
        }
    } catch (error) {
        console.error('Error processing subscription change:', error);
    }
};

/**
 * Handles successful payments
 */
const handleSuccessfulPayment = async (
    invoice: Stripe.Invoice,
    subscription: Stripe.Subscription
): Promise<void> => {
    try {
        const customerId = invoice.customer as string;

        // Find the associated user
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId);

        if (error || !users || users.length === 0) {
            console.error('Error finding user for invoice:', error || 'No user found');
            return;
        }

        const userId = users[0].id;

        // Ensure user has subscriber status for active subscriptions
        if (subscription.status === 'active') {
            await updateUserTier(userId, 'premium');
            console.log(`Confirmed subscriber status for user ${userId} after successful payment`);
        }

        // Record payment details if needed
        // You could store invoice data in a payments table
    } catch (error) {
        console.error('Error processing successful payment:', error);
    }
};

/**
 * Handles failed payments
 */
const handleFailedPayment = async (
    invoice: Stripe.Invoice,
    rawInvoice: any
): Promise<void> => {
    try {
        const customerId = invoice.customer as string;

        // Find the associated user
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('stripe_customer_id', customerId);

        if (error || !users || users.length === 0) {
            console.error('Error finding user for failed invoice:', error || 'No user found');
            return;
        }

        const userId = users[0].id;
        const userEmail = users[0].email;

        console.log(`Payment failed for user ${userId} (${userEmail}). Invoice: ${invoice.id}`);

        // If this is for a subscription, we might want to record that information
        if (rawInvoice.subscription) {
            console.log(`Failed payment was for subscription: ${rawInvoice.subscription}`);
            // Optionally handle subscription-specific logic here
        }

        // You could send a notification to the user about the failed payment
        // Or implement automatic downgrade after multiple failures

        // If you want to downgrade immediately on first failure:
        // await updateUserTier(userId, 'free');
    } catch (error) {
        console.error('Error processing failed payment:', error);
    }
}; 