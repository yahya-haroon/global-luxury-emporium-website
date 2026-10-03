-- ============================================================================
-- 20261003_sales_management.sql
-- Complete Sale / Discount Management System for Global Luxury Emporium
--
-- Features:
--   * public.sales table with discount_percentage, scope ('all', 'category', 'products'),
--     category, product_ids, starts_at, ends_at, is_active, banner_text
--   * Strict PostgreSQL constraints: discount_percentage between 0.01 and 100,
--     ends_at > starts_at
--   * Row Level Security (RLS):
--       - Public (anon + authenticated) can SELECT active sales.
--       - Owner ('yahyaharoon77@gmail.com') has full access (SELECT, INSERT, UPDATE, DELETE).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    discount_percentage NUMERIC(5, 2) NOT NULL,
    scope TEXT NOT NULL DEFAULT 'all',
    category TEXT,
    product_ids TEXT[] NOT NULL DEFAULT '{}',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    banner_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT sales_discount_percentage_check 
        CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    CONSTRAINT sales_scope_check 
        CHECK (scope IN ('all', 'category', 'products')),
    CONSTRAINT sales_ends_after_starts 
        CHECK (ends_at > starts_at)
);

-- Indexes for fast active sale lookups
CREATE INDEX IF NOT EXISTS sales_active_dates_idx 
    ON public.sales (is_active, starts_at, ends_at);

CREATE INDEX IF NOT EXISTS sales_scope_idx 
    ON public.sales (scope);

-- Enable Row Level Security
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- 1. Public read policy: Anyone can read active sales (so customers see live discount prices)
DROP POLICY IF EXISTS "Public read sales" ON public.sales;
CREATE POLICY "Public read sales"
ON public.sales
FOR SELECT
TO public
USING (
    is_active = true
    OR auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
);

-- 2. Owner full management: Owner can insert, update, delete sales
DROP POLICY IF EXISTS "Owner manage sales" ON public.sales;
CREATE POLICY "Owner manage sales"
ON public.sales
FOR ALL
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');
