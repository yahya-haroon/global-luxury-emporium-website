import Clarity from '@microsoft/clarity';

let isInitialized = false;

/**
 * Initializes Microsoft Clarity using the project ID configured in VITE_CLARITY_PROJECT_ID.
 * Executes strictly on the client side, only once per session.
 * If the environment variable is not set, it safely no-ops so the application never breaks.
 */
export function initClarity(): void {
  if (typeof window === 'undefined' || isInitialized) {
    return;
  }

  const projectId = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim();
  if (!projectId) {
    // In local development or environments without Clarity configured, safely return
    return;
  }

  try {
    Clarity.init(projectId);
    isInitialized = true;
  } catch (err) {
    console.warn('Unable to initialize Microsoft Clarity:', err);
  }
}

/**
 * Checks if Clarity is currently initialized on the client.
 */
export function isClarityActive(): boolean {
  return isInitialized && typeof window !== 'undefined';
}

/**
 * Safe wrapper for triggering custom Clarity events.
 * Event names conform to Clarity guidelines (alphanumeric string identifiers).
 */
export function trackClarityEvent(eventName: string): void {
  if (typeof window === 'undefined') return;
  try {
    Clarity.event(eventName);
  } catch {
    // Gracefully ignore if blocked by browser adblockers or privacy extensions
  }
}

/**
 * Safe wrapper for setting non-sensitive custom tags in Clarity.
 * NEVER pass PII (passwords, card data, personal names, phone numbers, full addresses, emails).
 */
export function setClarityTag(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    Clarity.setTag(key, value);
  } catch {
    // Gracefully ignore if blocked
  }
}

/**
 * High-level eCommerce telemetry methods for customer journey mapping.
 * Conforms to strict privacy guidelines: No customer personal data (PII) is captured.
 */
export const ClarityAnalytics = {
  /**
   * Track when the storefront homepage is viewed
   */
  homepageViewed(): void {
    trackClarityEvent('homepage_viewed');
  },

  /**
   * Track when customer selects or views a specific collection/category
   */
  categoryViewed(category: string): void {
    const sanitized = (category || 'All').trim();
    setClarityTag('selected_category', sanitized);
    trackClarityEvent('category_viewed');
  },

  /**
   * Track when a customer views a single product detail page
   */
  productViewed(product: { id: string; name: string; category?: string; price?: number }): void {
    setClarityTag('product_id', product.id);
    if (product.category) {
      setClarityTag('product_category', product.category);
    }
    trackClarityEvent('product_viewed');
  },

  /**
   * Track search queries without storing sensitive input
   */
  searchPerformed(query: string): void {
    const sanitized = query.trim().slice(0, 50);
    if (!sanitized) return;
    setClarityTag('search_term', sanitized);
    trackClarityEvent('search_performed');
  },

  /**
   * Track when an item is added to the shopping bag
   */
  productAddedToCart(item: { productId: string; name?: string; productName?: string; size?: string; price?: number }): void {
    setClarityTag('added_product_id', item.productId);
    if (item.size) {
      setClarityTag('added_product_size', item.size);
    }
    trackClarityEvent('product_added_to_cart');
  },

  /**
   * Track when customer opens and views their shopping cart drawer
   */
  cartViewed(itemCount: number, subtotal: number): void {
    setClarityTag('cart_items_count', String(itemCount));
    setClarityTag('cart_subtotal_tier', subtotal > 1000 ? 'tier_1000plus' : subtotal > 500 ? 'tier_500_1000' : 'tier_sub_500');
    trackClarityEvent('cart_viewed');
  },

  /**
   * Track when customer enters the checkout phase (single product or multi-item bag)
   */
  checkoutStarted(details?: { productId?: string; totalAmount?: number; itemCount?: number }): void {
    if (details?.productId) {
      setClarityTag('checkout_product_id', details.productId);
    }
    if (details?.itemCount !== undefined) {
      setClarityTag('checkout_item_count', String(details.itemCount));
    }
    trackClarityEvent('checkout_started');
  },

  /**
   * Track when an order / payment is successfully confirmed
   */
  orderCompleted(order: { orderId: string; totalAmount: number; currency: string }): void {
    setClarityTag('order_id', order.orderId);
    setClarityTag('order_currency', order.currency);
    trackClarityEvent('order_completed');
  },
};
