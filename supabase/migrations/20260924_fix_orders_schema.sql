-- ====================================================================
-- Migration: 20260923_fix_orders_schema.sql
-- Purpose:   The original schema.sql contained a legacy 'orders' table
--            with wrong columns (customer_email, amount_total, etc.).
--            Because CREATE TABLE IF NOT EXISTS skipped the correct DDL
--            in 20260923_orders_and_delivery.sql, the live table has the
--            wrong shape and every INSERT from the Edge Function fails.
--
--            Root cause of this migration failing on first attempt:
--            Three RLS policies reference orders.customer_id (directly or
--            via a sub-query). PostgreSQL refuses to DROP that column while
--            those policies exist, so they must be dropped FIRST.
--
--            Policies that block the DROP (all explicitly dropped in Step 1):
--              "Customers can view their own orders"      ON public.orders
--              "Customers can view their own order items" ON public.order_items
--              "Verified customers can write reviews"     ON public.reviews
--
--            After the column is removed, correct policies are rebuilt:
--              orders      – public INSERT, owner SELECT, owner UPDATE
--              order_items – owner SELECT only (no customer_id dependency)
--              reviews     – public SELECT, owner ALL, customer self-manage
--                            (reviews.customer_id column stays; it is on
--                             the reviews table itself, not orders)
-- ====================================================================


-- ============================================================
-- STEP 1  Drop every policy that directly or indirectly
--         references orders.customer_id.
--         Must happen BEFORE we attempt to drop the column.
-- ============================================================

-- Direct reference: USING (customer_id = auth.uid())
DROP POLICY IF EXISTS "Customers can view their own orders"
    ON public.orders;

-- Sub-query reference: WHERE o.customer_id = auth.uid()
DROP POLICY IF EXISTS "Customers can view their own order items"
    ON public.order_items;

-- Sub-query reference: AND o.customer_id = auth.uid()
DROP POLICY IF EXISTS "Verified customers can write reviews"
    ON public.reviews;

-- Pre-emptively drop other orders policies we will recreate in Step 6,
-- so this migration is safe to run against a partially-migrated database.
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow owner select orders"  ON public.orders;
DROP POLICY IF EXISTS "Allow owner update orders"  ON public.orders;


-- ============================================================
-- STEP 2  Remove the legacy columns from public.orders.
--         IF EXISTS makes each statement idempotent.
-- ============================================================

ALTER TABLE public.orders DROP COLUMN IF EXISTS customer_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS customer_email;
ALTER TABLE public.orders DROP COLUMN IF EXISTS stripe_checkout_session_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS amount_total;


-- ============================================================
-- STEP 3  Add all columns required by create-payment-intent.
--         ADD COLUMN IF NOT EXISTS is idempotent.
-- ============================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS size TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS personalisation_text TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS personalisation_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS requirements_text TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS requirements_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_zone TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS delivery_price NUMERIC(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS product_price NUMERIC(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';

-- address: added nullable first (so no existing-row constraint violation),
-- then given a safe default for all future inserts.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS address JSONB;

ALTER TABLE public.orders
    ALTER COLUMN address SET DEFAULT '{}'::jsonb;

-- stripe_payment_intent_id: the legacy table has this column as nullable TEXT.
-- Add it if it is missing (in case the table was recreated from scratch), then set NOT NULL.
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT NOT NULL DEFAULT '';


-- ============================================================
-- STEP 4  Fix column-level defaults and the status constraint.
-- ============================================================

-- Currency: legacy default was 'GBP'; correct default is the £ symbol.
ALTER TABLE public.orders ALTER COLUMN currency SET DEFAULT '£';

-- status CHECK constraint: legacy allowed 'cancelled' / 'refunded'.
-- New schema only allows 'pending', 'paid', 'failed'.
-- Scan pg_catalog for any check constraint on orders whose name contains
-- "status" (handles both auto-generated names and our explicit name).
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

-- Belt-and-suspenders: drop by our explicit name too, in case catalog lookup missed it.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
    ADD CONSTRAINT orders_status_check
    CHECK (status IN ('pending', 'paid', 'failed'));


-- ============================================================
-- STEP 5  Ensure RLS is (re-)enabled on all affected tables.
-- ============================================================

ALTER TABLE public.orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 6  Recreate correct RLS policies for public.orders.
-- ============================================================

-- 6a. Anyone (including the service-role Edge Function) can INSERT orders.
CREATE POLICY "Allow public insert orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (true);

-- 6b. Authenticated store owner can read all orders.
CREATE POLICY "Allow owner select orders"
ON public.orders
FOR SELECT
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- 6c. Authenticated store owner can update order status
--     (used by the stripe-webhook Edge Function to set status = 'paid').
CREATE POLICY "Allow owner update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING  (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');


-- ============================================================
-- STEP 7  Correct RLS policy for public.order_items.
--         The old policy joined orders.customer_id, which no
--         longer exists. Replace it with owner-only access.
--         (This app has no customer accounts, so the original
--          "customers view their own items" policy is moot.)
-- ============================================================

-- The old conflicting policy was already dropped in Step 1.
-- Just create the new one (guard against duplicate with IF NOT EXISTS equivalent):
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE  schemaname = 'public'
          AND  tablename  = 'order_items'
          AND  policyname = 'Allow owner select order items'
    ) THEN
        EXECUTE $policy$
            CREATE POLICY "Allow owner select order items"
            ON public.order_items
            FOR SELECT
            TO authenticated
            USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
        $policy$;
    END IF;
END $$;


-- ============================================================
-- STEP 8  Correct RLS policies for public.reviews.
--
--         "Verified customers can write reviews" was dropped in
--         Step 1 because it sub-queried orders.customer_id.
--         This app does not have customer accounts, so we do not
--         recreate that specific policy. The owner manages reviews
--         via the "Owner can manage reviews" ALL policy.
--
--         reviews.customer_id (the column on the reviews table
--         itself, referencing auth.users) is NOT being removed.
--         The self-management policies below still use it safely.
-- ============================================================

-- Public read (unchanged — drop+recreate for idempotency)
DROP POLICY IF EXISTS "Anyone can read published reviews" ON public.reviews;
CREATE POLICY "Anyone can read published reviews"
ON public.reviews
FOR SELECT
TO public
USING (published = true);

-- Owner full control (unchanged — drop+recreate for idempotency)
DROP POLICY IF EXISTS "Owner can manage reviews" ON public.reviews;
CREATE POLICY "Owner can manage reviews"
ON public.reviews
FOR ALL
TO authenticated
USING  (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- Customer self-manage: these reference reviews.customer_id (which still
-- exists). Drop+recreate cleanly for idempotency.
DROP POLICY IF EXISTS "Customers can update their own reviews" ON public.reviews;
CREATE POLICY "Customers can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING  (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Customers can delete their own reviews" ON public.reviews;
CREATE POLICY "Customers can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (customer_id = auth.uid());


-- ============================================================
-- STEP 9  Ensure delivery_zones column exists on settings.
--         (idempotent DO block)
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   information_schema.columns
        WHERE  table_schema = 'public'
          AND  table_name   = 'settings'
          AND  column_name  = 'delivery_zones'
    ) THEN
        ALTER TABLE public.settings
        ADD COLUMN delivery_zones JSONB NOT NULL DEFAULT '[
            {"id": "uk",  "name": "United Kingdom", "price": 0.00},
            {"id": "row", "name": "Rest of world",  "price": 35.00}
        ]'::jsonb;
    END IF;
END $$;
