import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

export const BillingService = {
  createPlanCheckout: async (orgId: string, planName: string, screens: number, seats: number, returnTo: 'setup' | 'billing', requestId: string): Promise<string> => {
    const call = httpsCallable(functions, 'createStripeCheckoutSession');
    const response = await call({ orgId, planName, screens, seats, returnTo, requestId, mode: 'subscription' });
    const url = (response.data as { url?: string }).url;
    if (!url || new URL(url).protocol !== 'https:') throw new Error('Payment options could not be opened.');
    return url;
  },
  /**
   * Create a Stripe Checkout Session for subscription
   */
  createCheckoutSession: async (
    priceId: string, 
    successUrl: string, 
    cancelUrl: string,
    addOns?: { screen?: number; seat?: number; screenPriceId?: string; seatPriceId?: string }
  ): Promise<string> => {
    try {
      const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const { data } = await createSession({ 
        priceId, 
        successUrl, 
        cancelUrl,
        addOns 
      });
      const response = data as { url: string };
      return response.url;
    } catch {
      throw new Error('Failed to create checkout session. Please try again.');
    }
  },

  /**
   * Create a Customer Portal Session for managing existing subscription
   */
  createPortalSession: async (returnUrl: string): Promise<string> => {
    try {
      const createPortal = httpsCallable(functions, 'createStripePortalSession');
      const { data } = await createPortal({ returnUrl });
      const response = data as { url: string };
      return response.url;
    } catch {
      throw new Error('Failed to create portal session. Please try again.');
    }
  },

  /**
   * Create a Stripe Checkout Session for a one-time payment (Design Job)
   */
  createOneTimeCheckoutSession: async (
    amount: number,
    currency: string = 'usd',
    metadata: { jobId: string; type: 'design_job' },
    successUrl: string,
    cancelUrl: string
  ): Promise<string> => {
    try {
      const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const { data } = await createSession({
        mode: 'payment', // One-time payment
        amount, // Amount in cents
        currency,
        metadata,
        successUrl,
        cancelUrl
      });
      const response = data as { url: string };
      return response.url;
    } catch {
      throw new Error('Failed to create payment session. Please try again.');
    }
  },

  /**
   * Create a Stripe Connect Account Link for designers to onboard
   */
  createConnectAccountLink: async (designerId: string, returnUrl: string): Promise<string> => {
    try {
      const createLink = httpsCallable(functions, 'createStripeConnectAccountLink');
      const { data } = await createLink({ designerId, returnUrl });
      const response = data as { url: string };
      return response.url;
    } catch {
      throw new Error('Failed to create account link. Please try again.');
    }
  },

  /**
   * Trigger a payout to a designer (Transfer funds)
   */
  payoutDesigner: async (jobId: string, designerId: string, amount: number): Promise<void> => {
    try {
      const payout = httpsCallable(functions, 'payoutDesigner');
      await payout({ jobId, designerId, amount });
    } catch {
      throw new Error('Failed to process payout.');
    }
  },

  /**
   * Get available subscription plans from Firestore system configuration
   */
  getSubscriptionPlans: async () => {
    const getPlans = httpsCallable(functions, 'getSubscriptionPlans');
    const { data } = await getPlans();
    return data as Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      interval: string;
      features: string[];
    }>;
  }
};
