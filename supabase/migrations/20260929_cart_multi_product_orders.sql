-- ====================================================================
-- Migration: 20260929_cart_multi_product_orders.sql
-- Purpose:   Add 'items' JSONB column to public.orders table so
--            multi-product shopping bag checkouts can persist full
--            itemized details (products, sizes, options, personalisations).
-- ====================================================================

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Comment for schema documentation
COMMENT ON COLUMN public.orders.items IS 'Array of cart items purchased in this order, each with productId, productName, size, options, quantity, and unit price';
