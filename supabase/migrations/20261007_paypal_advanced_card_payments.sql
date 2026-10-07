-- ====================================================================
-- Migration: 20261007_paypal_advanced_card_payments.sql
-- Purpose:   Add card brand and last four digits columns to public.orders
--            to support PayPal Advanced Credit & Debit Card Payments.
-- ====================================================================

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS card_brand TEXT DEFAULT '';

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS card_last4 TEXT DEFAULT '';

COMMENT ON COLUMN public.orders.card_brand IS 'Non-sensitive payment card network (e.g. visa, mastercard, amex)';
COMMENT ON COLUMN public.orders.card_last4 IS 'Non-sensitive last 4 digits of the payment card';
