import { loadStripe, Stripe } from '@stripe/stripe-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { OrderAddress, CartItem } from '../types';

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder_gle';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

export interface CreatePaymentIntentPayload {
  items?: CartItem[];
  // Legacy fields for direct 1-product checkout
  productId?: string;
  size?: string;
  selectedOptions?: Record<string, string>;
  personalisationText?: string;
  requirementsText?: string;
  deliveryZoneId: string;
  customerName: string;
  email: string;
  address: OrderAddress;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  orderId: string;
  amount: number;
  error?: string;
}

/**
 * Invokes the Supabase Edge Function `create-payment-intent`.
 * Computes all pricing server-side, creates the Stripe PaymentIntent,
 * records the order as 'pending' in the `orders` table, and returns client_secret.
 */
export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<CreatePaymentIntentResponse> {
  if (isSupabaseConfigured) {
    // Real path: call the deployed Edge Function.
    // Do NOT silently fall back to mock — if this fails the user must see the error.
    const { data, error } = await supabase.functions.invoke(
      'create-payment-intent',
      { body: payload }
    );

    if (error) {
      throw new Error(error.message || 'Payment service error');
    }

    if (!data?.clientSecret) {
      throw new Error(data?.error || 'Failed to initialize payment');
    }

    return data as CreatePaymentIntentResponse;
  }

  // Offline / Demo fallback — only reached when Supabase is not configured at all.
  return mockCreatePaymentIntent(payload);
}

/**
 * Development fallback when Supabase Edge Functions are not deployed locally.
 */
async function mockCreatePaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<CreatePaymentIntentResponse> {
  const mockId = `mock_pi_${Date.now()}`;
  const mockSecret = `${mockId}_secret_test`;

  let total = 0;
  if (payload.items && payload.items.length > 0) {
    const itemsTotal = payload.items.reduce(
      (sum, item) =>
        sum +
        (item.price * (item.quantity || 1)) +
        ((item.personalisationFee || 0) * (item.quantity || 1)) +
        ((item.requirementsFee || 0) * (item.quantity || 1)),
      0
    );
    // Flat delivery fee (defaults to 15 if zone id not resolved locally)
    const delivery = 15;
    total = itemsTotal + delivery;
  } else {
    total = 349;
  }

  return {
    clientSecret: mockSecret,
    orderId: `ord_${Date.now()}`,
    amount: total,
  };
}
