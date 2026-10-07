-- ====================================================================
-- Migration: 20261007_paypal_orders_schema.sql
-- Purpose:   Add payment method and PayPal transaction columns to
--            public.orders table to support PayPal and Pay Later checkouts.
-- ====================================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paypal_order_id TEXT DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paypal_capture_id TEXT DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Ensure stripe_payment_intent_id allows empty string for non-stripe orders
ALTER TABLE public.orders
    ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;

-- Index for quick lookup of PayPal orders
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id
    ON public.orders (paypal_order_id)
    WHERE paypal_order_id IS NOT NULL AND paypal_order_id <> '';

COMMENT ON COLUMN public.orders.payment_method IS 'Payment gateway used: stripe, paypal, or paylater';
COMMENT ON COLUMN public.orders.paypal_order_id IS 'PayPal Order identifier generated at checkout order creation';
COMMENT ON COLUMN public.orders.paypal_capture_id IS 'PayPal Capture ID returned upon successful settlement';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment settlement status: pending, completed, or failed';
COMMENT ON COLUMN public.orders.paid_at IS 'Timestamp when payment was verified and captured';
