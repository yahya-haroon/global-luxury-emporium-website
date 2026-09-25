import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// --------------------------------------------------------------------
// submit-review Edge Function
//
// This is the ONLY code path that can create or edit a customer review.
// It runs with the service-role key (bypasses RLS) and enforces the
// verified-purchase rules server-side so the browser cannot forge them:
//
//   * The order must exist.
//   * The order must belong to the supplied email (order owner).
//   * The order must contain the exact product being reviewed.
//   * The order status must be 'delivered'.
//   * One review per order (create) / edit only your own (update).
//
// The `verified` flag is ALWAYS set here (true). It is never accepted
// from the client, so a customer cannot self-mark as verified.
// --------------------------------------------------------------------

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VALID_RATINGS = [1, 2, 3, 4, 5];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return json({ error: 'Server is not configured for reviews.' }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'submit');
    const productId = String(body?.productId || '').trim();
    const orderId = String(body?.orderId || '').trim();
    const email = normalizeEmail(body?.email);

    if (!productId || !orderId || !email) {
      return json(
        { error: 'Product, order reference, and email are all required.' },
        400
      );
    }

    // ---------------------------------------------------------------
    // Load and verify the qualifying order (shared by all actions).
    // ---------------------------------------------------------------
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, product_id, email, status, customer_name')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr) {
      return json({ error: 'Could not validate the order.' }, 500);
    }

    if (!order) {
      return json({ eligible: false, reason: 'order_not_found' }, 200);
    }

    if (normalizeEmail(order.email) !== email) {
      // Do not leak whether the order exists for a different email.
      return json({ eligible: false, reason: 'order_not_found' }, 200);
    }

    if (String(order.product_id) !== productId) {
      return json({ eligible: false, reason: 'product_mismatch' }, 200);
    }

    // Look up any existing review for this order once.
    const { data: existing, error: existingErr } = await supabase
      .from('reviews')
      .select('id, rating, review, verified, created_at, updated_at')
      .eq('order_id', orderId)
      .maybeSingle();

    if (existingErr) {
      return json({ error: 'Could not validate existing review.' }, 500);
    }

    const isDelivered = order.status === 'delivered';

    // ---------------------------------------------------------------
    // ACTION: check eligibility (used to decide which UI to show).
    // ---------------------------------------------------------------
    if (action === 'check') {
      if (!isDelivered) {
        return json({
          eligible: false,
          reason: order.status === 'cancelled' ? 'order_cancelled' : 'not_delivered',
          orderStatus: order.status,
        }, 200);
      }

      return json({
        eligible: true,
        hasReview: Boolean(existing),
        customerName: order.customer_name || '',
        existingReview: existing
          ? {
              id: existing.id,
              rating: existing.rating,
              review: existing.review,
            }
          : null,
      }, 200);
    }

    // ---------------------------------------------------------------
    // From here on (submit/update) the order MUST be delivered.
    // ---------------------------------------------------------------
    if (!isDelivered) {
      return json(
        { error: 'Reviews become available once your order is delivered.' },
        403
      );
    }

    const rating = Number(body?.rating);
    const reviewText = String(body?.review || '').trim();

    if (!VALID_RATINGS.includes(rating)) {
      return json({ error: 'Please provide a rating from 1 to 5.' }, 400);
    }

    if (reviewText.length < 1 || reviewText.length > 3000) {
      return json({ error: 'Review text must be between 1 and 3000 characters.' }, 400);
    }

    // ---------------------------------------------------------------
    // ACTION: update an existing review (rating + text only).
    // product_id, order_id, customer_email, verified stay untouched.
    // ---------------------------------------------------------------
    if (action === 'update') {
      if (!existing) {
        return json({ error: 'No existing review found to edit.' }, 404);
      }

      const { data: updated, error: updateErr } = await supabase
        .from('reviews')
        .update({
          rating,
          review: reviewText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateErr) {
        return json({ error: updateErr.message || 'Failed to update review.' }, 500);
      }

      return json({ ok: true, review: sanitize(updated) }, 200);
    }

    // ---------------------------------------------------------------
    // ACTION: submit a new review (default).
    // ---------------------------------------------------------------
    if (existing) {
      return json(
        { error: 'You have already reviewed this order. Please edit it instead.' },
        409
      );
    }

    const { data: created, error: insertErr } = await supabase
      .from('reviews')
      .insert([
        {
          product_id: productId,
          order_id: orderId,
          customer_name: order.customer_name || '',
          rating,
          review: reviewText,
          verified: true, // server-authoritative
          published: true,
        },
      ])
      .select()
      .single();

    if (insertErr) {
      return json({ error: insertErr.message || 'Failed to save review.' }, 500);
    }

    return json({ ok: true, review: sanitize(created) }, 200);
  } catch (err) {
    console.error('Error in submit-review:', err);
    return json(
      { error: (err as Error)?.message || 'Review submission failed.' },
      500
    );
  }
});

// Never return the customer email back to the client.
function sanitize(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    product_id: row.product_id,
    order_id: row.order_id,
    customer_name: row.customer_name || '',
    rating: row.rating,
    review: row.review,
    verified: row.verified,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
