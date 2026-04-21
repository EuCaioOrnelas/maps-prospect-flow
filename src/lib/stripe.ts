// Stripe.js publishable key - safe to be in frontend.
import { loadStripe } from "@stripe/stripe-js";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SXrIWK8CM0R6xMMcr7LFQxiuUz5hDqC7fEFSatME2vxXAwmqVUfherSnxFg9U4zBbf8nQrZFrZnx5UilliI5vIU00VIcOBJ3l";

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
