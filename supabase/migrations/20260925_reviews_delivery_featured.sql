-- ====================================================================
-- Migration: 20260925_reviews_delivery_featured.sql
-- Purpose:
--   1) Extend orders.status to support the delivery workflow
--      (paid -> processing -> shipped -> delivered, plus cancelled).
--   2) Replace the unusable legacy `reviews` table with an
--      order/email-keyed table that matches the ACTUAL guest-checkout
--      architecture (no customer accounts).
--   3) Add a `featured_images` table for the admin-controlled rotating
--      gallery.
--   4) Lock down RLS so reviews can ONLY be written by the service-role
--      Edge Function (anon key has no INSERT path) and moderated by owner.
--
-- Design notes:
--   * Each order in this store is a SINGLE product (orders.product_id),
--     so "the order contains the product" == orders.product_id = productId.
--   * `reviews.verified` is authoritative and is set ONLY by the Edge
--     Function after it confirms a delivered, matching, owned order.
--     There is NO anon/authenticated INSERT policy, so the browser
--     cannot create or self-verify a review. The service role bypasses
--     RLS; the frontend never holds the service key.
--
-- DESTRUCTIVE STEP (review before applying):
--   This migration DROPs the legacy public.reviews table. That table was
--   designed for an account model that was never built (it required
--   customer_id -> auth.users and order_item_id, neither of which the
--   guest Stripe checkout ever populates), so it cannot hold legitimate
--   data in this deployment. If you believe real review data exists,
--   back it up before applying.
-- ====================================================================


-- ====================================================================
-- 1. ORDERS: extend status workflow (additive, backward compatible)
-- ====================================================================
-- Existing values ('pending','paid','failed') remain valid; we add
-- 'processing','shipped','delivered','cancelled'.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.constraint_name
        FROM   information_schema.table_constraints tc
        WHERE  tc.table_schema    = 'public'
          AND  tc.table_name      = 'orders'
          AND  tc.constraint_type = 'CHECK'
          AND  tc.constraint_name ILIKE '%status%'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS %I',
            r.constraint_name
        );
    END LOOP;
END $$;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN (
        'pending',
        'paid',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'failed'
    ));


-- ====================================================================
-- 2. REVIEWS: replace legacy auth-based table with order/email model
-- ====================================================================

-- Drop legacy policies first (they may reference columns we remove),
-- then drop the table. All are idempotent.
DROP POLICY IF EXISTS "Anyone can read published reviews"     ON public.reviews;
DROP POLICY IF EXISTS "Verified customers can write reviews"  ON public.reviews;
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can delete their own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Owner can manage reviews"              ON public.reviews;
DROP POLICY IF EXISTS "Public read published reviews"         ON public.reviews;

DROP TABLE IF EXISTS public.reviews;

CREATE TABLE public.reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Matches orders.product_id (a UUID stored as TEXT).
    product_id      TEXT            NOT NULL,

    -- The qualifying order. Cascade delete if the order is removed.
    order_id        UUID            NOT NULL
                        REFERENCES public.orders(id) ON DELETE CASCADE,

    -- Display name shown publicly with the review. The customer's email
    -- is intentionally NOT stored here: this table is publicly readable,
    -- and ownership is verified against orders.email at write time, so a
    -- raw email column would only leak PII. Admins can resolve the buyer
    -- via order_id -> orders.email (owner-only).
    customer_name   TEXT            NOT NULL DEFAULT '',

    rating          INTEGER         NOT NULL
                        CHECK (rating >= 1 AND rating <= 5),

    review          TEXT            NOT NULL
                        CHECK (char_length(review) >= 1 AND char_length(review) <= 3000),

    -- Authoritative verification flag. Set ONLY by the Edge Function.
    verified        BOOLEAN         NOT NULL DEFAULT false,

    -- Admin moderation: unpublished reviews are hidden from the public.
    published       BOOLEAN         NOT NULL DEFAULT true,

    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    -- One review per order (each order is a single product), which also
    -- means one review per customer per product order. Editing updates
    -- this same row rather than creating duplicates.
    CONSTRAINT one_review_per_order UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx
    ON public.reviews (product_id);

CREATE INDEX IF NOT EXISTS reviews_product_published_idx
    ON public.reviews (product_id, published);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 2a. Public read: anyone can read published reviews; owner can read all.
DROP POLICY IF EXISTS "Public read published reviews" ON public.reviews;
CREATE POLICY "Public read published reviews"
ON public.reviews
FOR SELECT
TO public
USING (
    published = true
    OR auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
);

-- 2b. Owner moderation: full control for the authenticated owner.
DROP POLICY IF EXISTS "Owner can manage reviews" ON public.reviews;
CREATE POLICY "Owner can manage reviews"
ON public.reviews
FOR ALL
TO authenticated
USING  (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- NOTE: There is deliberately NO INSERT/UPDATE policy for anon or for
-- regular authenticated customers. All customer review writes go through
-- the `submit-review` Edge Function using the service-role key, which
-- bypasses RLS AFTER it verifies the delivered/owned/matching order.
-- This makes it impossible to insert or self-verify a review from the
-- browser.


-- ====================================================================
-- 3. FEATURED IMAGES: admin-controlled rotating gallery
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.featured_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url   TEXT            NOT NULL,
    alt_text    TEXT            NOT NULL DEFAULT '',
    is_active   BOOLEAN         NOT NULL DEFAULT true,
    sort_order  INTEGER         NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS featured_images_active_sort_idx
    ON public.featured_images (is_active, sort_order);

ALTER TABLE public.featured_images ENABLE ROW LEVEL SECURITY;

-- Public can read active images; owner can read all.
DROP POLICY IF EXISTS "Public read active featured images" ON public.featured_images;
CREATE POLICY "Public read active featured images"
ON public.featured_images
FOR SELECT
TO public
USING (
    is_active = true
    OR auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
);

-- Owner full control.
DROP POLICY IF EXISTS "Owner can manage featured images" ON public.featured_images;
CREATE POLICY "Owner can manage featured images"
ON public.featured_images
FOR ALL
TO authenticated
USING  (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');
