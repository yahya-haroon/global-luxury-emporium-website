// ==============================================================================
// Global Luxury Emporium - PayPal JS SDK Integration (Official v6 Web SDK)
// ==============================================================================

import { supabase, isSupabaseConfigured } from './supabase';
import { CartItem, OrderAddress } from '../types';

declare global {
  interface Window {
    paypal?: any;
  }
}

/**
 * Maps store currency symbol or code to standard ISO 4217 currency code
 */
export function toIsoCurrency(currencySymbolOrCode: string = '£'): string {
  if (!currencySymbolOrCode) return 'GBP';
  const clean = currencySymbolOrCode.trim().toUpperCase();
  if (clean === '£' || clean === 'GBP') return 'GBP';
  if (clean === '$' || clean === 'USD') return 'USD';
  if (clean === '€' || clean === 'EUR') return 'EUR';
  return 'GBP';
}

let v6SdkPromise: Promise<any> | null = null;
let currentLoadedKey: string | null = null;
let cachedClientToken: string | null = null;
let clientTokenFetchPromise: Promise<string | null> | null = null;

/**
 * Securely retrieves a PayPal client token from the backend Supabase Edge Function
 * for PayPal Advanced Card Payments (Card Fields).
 * Never exposes the client secret to the frontend.
 */
export async function fetchPayPalClientToken(): Promise<string | null> {
  if (cachedClientToken) return cachedClientToken;
  if (clientTokenFetchPromise) return clientTokenFetchPromise;

  clientTokenFetchPromise = (async () => {
    if (!isSupabaseConfigured) return null;
    try {
      // 1. Try dedicated get-paypal-client-token endpoint
      const { data, error } = await supabase.functions.invoke('get-paypal-client-token');
      if (!error && data?.clientToken) {
        cachedClientToken = data.clientToken;
        return cachedClientToken;
      }
    } catch {
      // ignore and fallback
    }

    try {
      // 2. Fallback to create-paypal-order with generate-client-token action
      const { data, error } = await supabase.functions.invoke('create-paypal-order', {
        body: { action: 'generate-client-token' },
      });
      if (!error && data?.clientToken) {
        cachedClientToken = data.clientToken;
        return cachedClientToken;
      }
    } catch (err) {
      console.warn('[PayPal v6] Client token generation could not be completed:', err);
    }
    return null;
  })();

  return clientTokenFetchPromise;
}

/**
 * Loads the official PayPal Web SDK v6 Core script and creates an SDK instance.
 * Script source: https://www.paypal.com/web-sdk/v6/core
 * Components: ['paypal-payments'] and conditionally ['card-fields'] when clientToken is provided.
 */
export function loadPayPalV6Sdk(
  clientId?: string,
  _currency: string = 'GBP',
  clientToken?: string | null
): Promise<any> {
  const envClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const effectiveClientId = (clientId && clientId.trim()) || (envClientId && envClientId.trim()) || 'test';
  const effectiveToken = clientToken?.trim() || null;
  const cacheKey = `${effectiveClientId}_${effectiveToken ? 'token' : 'notoken'}`;

  if (v6SdkPromise && currentLoadedKey === cacheKey) {
    return v6SdkPromise;
  }

  currentLoadedKey = cacheKey;

  v6SdkPromise = new Promise(async (resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window is not defined'));
    }

    try {
      // 1. Remove any legacy v5 script that may conflict
      const legacyV5Script = document.getElementById('gle-paypal-sdk');
      if (legacyV5Script) {
        legacyV5Script.remove();
      }

      // 2. Ensure official v6 core script is loaded
      const SCRIPT_ID = 'gle-paypal-v6-core';
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.type = 'text/javascript';
        script.async = true;
        script.src = 'https://www.paypal.com/web-sdk/v6/core';
        document.head.appendChild(script);

        await new Promise<void>((res, rej) => {
          if (!script) return rej(new Error('Script tag not found'));
          script.onload = () => {
            console.log('[PayPal v6] Core script loaded from https://www.paypal.com/web-sdk/v6/core');
            res();
          };
          script.onerror = (err) => {
            console.error('[PayPal v6] Failed to load core script from https://www.paypal.com/web-sdk/v6/core', err);
            rej(new Error('Failed to load PayPal v6 SDK Core'));
          };
        });
      }

      // Check if createInstance is available on window.paypal or window.paypal.v6
      const createInstanceFn =
        (window.paypal && typeof window.paypal.createInstance === 'function' && window.paypal.createInstance) ||
        (window.paypal?.v6 && typeof window.paypal.v6.createInstance === 'function' && window.paypal.v6.createInstance);

      if (!createInstanceFn) {
        throw new Error('PayPal v6 core loaded but window.paypal.createInstance is not defined');
      }

      console.log('[PayPal v6] Initializing createInstance with clientId:', effectiveClientId, 'hasClientToken:', Boolean(effectiveToken));

      const components = ['paypal-payments'];
      const instanceConfig: any = {
        clientId: effectiveClientId,
        components,
        pageType: 'checkout',
      };

      if (effectiveToken) {
        components.push('card-fields');
        instanceConfig.clientToken = effectiveToken;
      }

      // 3. Initialize SDK instance with components
      const sdkInstance = await createInstanceFn(instanceConfig);

      console.log('[PayPal v6] SDK Instance successfully created:', sdkInstance);
      resolve(sdkInstance);
    } catch (err: any) {
      console.error('[PayPal v6] Initialization error:', err);
      v6SdkPromise = null;
      reject(err);
    }
  });

  return v6SdkPromise;
}

// Backward-compatible alias
export const loadPayPalSdk = loadPayPalV6Sdk;

export type PayPalFundingSource = 'paypal' | 'paylater' | 'paypal_card';

export interface CreatePayPalOrderPayload {
  items: CartItem[];
  deliveryZoneId: string;
  customerName: string;
  email: string;
  address: OrderAddress;
  fundingSource?: PayPalFundingSource;
}

export interface CreatePayPalOrderResponse {
  paypalOrderId: string;
  orderId: string;
  amount: number;
  currency: string;
}

/**
 * Server-side PayPal Order creation via Supabase Edge Function `create-paypal-order`.
 * Calculates authoritative order totals server-side using trusted product and sale data.
 */
export async function createPayPalServerOrder(
  payload: CreatePayPalOrderPayload
): Promise<CreatePayPalOrderResponse> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('create-paypal-order', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'PayPal server order initialization failed');
    }

    if (!data?.paypalOrderId) {
      throw new Error(data?.error || 'Failed to create PayPal order on server');
    }

    return data as CreatePayPalOrderResponse;
  }

  // Local demo fallback if Supabase Edge Functions are offline
  const fallbackId = `PP_ORDER_${Date.now()}`;
  return {
    paypalOrderId: fallbackId,
    orderId: `ORD_${Date.now()}`,
    amount: 0,
    currency: 'GBP',
  };
}

export interface CapturePayPalOrderPayload {
  orderId?: string;
  paypalOrderId: string;
  fundingSource?: PayPalFundingSource;
}

export interface CapturePayPalOrderResponse {
  success: boolean;
  orderId: string;
  captureId: string;
  status: string;
  payer?: {
    email?: string;
    name?: string;
  };
}

/**
 * Server-side PayPal Order capture via Supabase Edge Function `capture-paypal-order`.
 * Verifies settlement with PayPal before marking the order as paid.
 */
export async function capturePayPalServerOrder(
  payload: CapturePayPalOrderPayload
): Promise<CapturePayPalOrderResponse> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.functions.invoke('capture-paypal-order', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'PayPal capture failed');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'PayPal capture could not be confirmed');
    }

    return data as CapturePayPalOrderResponse;
  }

  // Local demo fallback
  return {
    success: true,
    orderId: payload.orderId || `ORD_${Date.now()}`,
    captureId: `CAP_${Date.now()}`,
    status: 'paid',
  };
}
