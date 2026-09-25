import { supabase, isSupabaseConfigured } from './supabase';
import { Review } from '../types';

// Columns safe to expose publicly (never selects any buyer email — the
// reviews table does not store one).
const PUBLIC_REVIEW_COLUMNS =
  'id, product_id, order_id, customer_name, rating, review, verified, published, created_at, updated_at';

export interface ReviewEligibility {
  eligible: boolean;
  hasReview?: boolean;
  customerName?: string;
  reason?:
    | 'order_not_found'
    | 'product_mismatch'
    | 'not_delivered'
    | 'order_cancelled';
  orderStatus?: string;
  existingReview?: { id: string; rating: number; review: string } | null;
}

/**
 * Fetch published reviews for a product (public read via RLS).
 * Returns [] gracefully when Supabase is not configured or the table
 * does not exist yet.
 */
export async function fetchProductReviews(productId: string): Promise<Review[]> {
  if (!isSupabaseConfigured || !productId) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(PUBLIC_REVIEW_COLUMNS)
    .eq('product_id', productId)
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Reviews fetch notice (table may need migration):', error.message);
    return [];
  }

  return (data || []) as Review[];
}

async function invokeSubmitReview(payload: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured) {
    throw new Error('Reviews are unavailable because Supabase is not configured.');
  }

  const { data, error } = await supabase.functions.invoke('submit-review', {
    body: payload,
  });

  if (error) {
    // FunctionsHttpError / relay errors surface here.
    throw new Error(error.message || 'Review service error');
  }

  return data;
}

/** Check whether a given order+email can review a product (and if it already has). */
export async function checkReviewEligibility(
  productId: string,
  orderId: string,
  email: string
): Promise<ReviewEligibility> {
  const data = await invokeSubmitReview({ action: 'check', productId, orderId, email });
  return data as ReviewEligibility;
}

/** Create a new verified review (server verifies the delivered order). */
export async function submitReview(
  productId: string,
  orderId: string,
  email: string,
  rating: number,
  review: string
): Promise<{ ok: true; review: Review } | { error: string }> {
  const data = await invokeSubmitReview({
    action: 'submit',
    productId,
    orderId,
    email,
    rating,
    review,
  });
  if (data?.error) return { error: data.error };
  return { ok: true, review: data.review as Review };
}

/** Edit an existing review's rating/text (ownership re-verified server-side). */
export async function updateReview(
  productId: string,
  orderId: string,
  email: string,
  rating: number,
  review: string
): Promise<{ ok: true; review: Review } | { error: string }> {
  const data = await invokeSubmitReview({
    action: 'update',
    productId,
    orderId,
    email,
    rating,
    review,
  });
  if (data?.error) return { error: data.error };
  return { ok: true, review: data.review as Review };
}
