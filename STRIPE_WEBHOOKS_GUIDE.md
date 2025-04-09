# Stripe Webhook Integration: A Comprehensive Guide

## Introduction
Handling Stripe webhooks properly is critical for maintaining the integrity of your payment system. This guide will walk you through setting up webhook endpoints, finding your webhook signing secrets, and properly implementing signature verification.

## How to Find Your Webhook Signing Secret in Stripe Dashboard

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **Webhooks** in the left sidebar
3. You'll see a list of your configured webhook endpoints
4. Select the endpoint you want to find the secret for
5. Click on the **Reveal** button next to "Signing secret"
   - Note: You might need to click on "Show test secrets" if you're in test mode

![Stripe Dashboard Webhooks Section](https://stripe.com/img/docs/webhooks/dashboard-webhook.png)

## Setting Up a Webhook Endpoint

1. In the Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter the URL of your webhook endpoint (e.g., `https://your-app.com/api/stripe/webhook`)
4. Select the events you want to listen for (e.g., `checkout.session.completed`)
5. Click **Add endpoint**

## **⚠️ IMPORTANT: WEBHOOK SECRETS ARE DIFFERENT FOR LIVE ENDPOINTS AND LOCAL TESTING ⚠️**

### **In both cases, the secret starts with a `whsec_` prefix, but the secret itself is different. Don't verify signatures on events forwarded by the CLI using the secret from a Dashboard-managed endpoint, or the other way around.**

## Using the Correct Webhook Secret

### For Production/Live Endpoints
- When webhooks are sent directly to your deployed application, you must use the webhook signing secret from the Stripe Dashboard.
- This secret is specific to the endpoint you registered in the Stripe Dashboard.

### For Local Testing with Stripe CLI
- When using `stripe listen --forward-to` command for local testing, you must use the webhook signing secret that's displayed in the console when you start the CLI tool.
- The CLI shows this message when you start listening:
  ```
  Ready! Your webhook signing secret is whsec_123abc... (^C to quit)
  ```
- This secret is different from your dashboard endpoint secret.

## Implementing Webhook Signature Verification

To properly verify Stripe webhook signatures:

1. Ensure your webhook endpoint receives the raw request body
2. Extract the Stripe signature from the request headers
3. Verify the signature using the appropriate signing secret

### Code Example (Node.js)

```typescript
// Disable body parsing for this endpoint
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function stripeWebhookHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    // IMPORTANT: Use the correct webhook secret!
    // For production endpoints - use Dashboard secret
    // For Stripe CLI testing - use CLI secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log('Event processed successfully:', event.type);
  return res.status(200).json({ received: true });
}
```

## Common Issues and Troubleshooting

1. **Signature verification failed**: This usually happens when:
   - Using the wrong webhook secret
   - The request body is parsed/modified before verification
   - The request is not received as a raw buffer

2. **Body parsing issues**: Ensure that body parsing is disabled for the webhook endpoint:
   - In Next.js: Use `export const config = { api: { bodyParser: false } }`
   - In Express: Use raw buffer middleware before any JSON parsers 

3. **Incorrect webhook secret**: Double-check which environment you're using:
   - Production endpoint → Use Dashboard secret
   - Local testing with Stripe CLI → Use CLI-provided secret

## Best Practices

1. Store your webhook secrets securely in environment variables
2. Always verify the signature of incoming webhook events
3. Implement idempotency to handle duplicate webhook events
4. Log webhook events for debugging and auditing purposes
5. Return a 2xx response quickly to acknowledge receipt

By following these guidelines, you can ensure your Stripe webhook integration is secure and reliable.

## Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Webhook Signature Verification](https://stripe.com/docs/webhooks/signatures) 