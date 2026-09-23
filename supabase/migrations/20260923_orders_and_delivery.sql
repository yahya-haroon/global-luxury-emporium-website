-- ====================================================================
-- Migration: 20260923_orders_and_delivery.sql
-- Description: Add orders table, delivery_zones to settings, and drop legacy Stripe Payment Link columns
-- ====================================================================

-- 1. Add delivery_zones to settings table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'settings'
        AND column_name = 'delivery_zones'
    ) THEN
        ALTER TABLE public.settings
        ADD COLUMN delivery_zones JSONB NOT NULL DEFAULT '[
            {"id": "uk", "name": "United Kingdom", "price": 0.00},
            {"id": "row", "name": "Rest of world", "price": 0.00}
        ]'::jsonb;
    END IF;
END $$;

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    selected_options JSONB DEFAULT '{}'::jsonb,
    personalisation_text TEXT DEFAULT '',
    personalisation_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    requirements_text TEXT DEFAULT '',
    requirements_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_zone TEXT NOT NULL,
    delivery_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    product_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT '£',
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    address JSONB NOT NULL, -- { line1, city, postal_code, country }
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    stripe_payment_intent_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Orders Policies
-- Allow anyone (public/edge function) to insert orders
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
CREATE POLICY "Allow public insert orders"
ON public.orders FOR INSERT
TO public
WITH CHECK (true);

-- Allow authenticated owner to view all orders
DROP POLICY IF EXISTS "Allow owner select orders" ON public.orders;
CREATE POLICY "Allow owner select orders"
ON public.orders FOR SELECT
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- Allow authenticated owner to update orders
DROP POLICY IF EXISTS "Allow owner update orders" ON public.orders;
CREATE POLICY "Allow owner update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- 5. Drop legacy Stripe Payment Link columns from products table if they exist
ALTER TABLE public.products DROP COLUMN IF EXISTS link;
ALTER TABLE public.products DROP COLUMN IF EXISTS link_p;
ALTER TABLE public.products DROP COLUMN IF EXISTS link_r;
ALTER TABLE public.products DROP COLUMN IF EXISTS link_pr;
