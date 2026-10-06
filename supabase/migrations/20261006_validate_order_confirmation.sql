-- ==============================================================================
-- Migration: 20261006_validate_order_confirmation.sql
-- Purpose:   Securely validate order completion status for Google Customer
--            Reviews survey opt-in and confirmation page.
--
-- Security:  SECURITY DEFINER runs with elevated privileges but ONLY returns
--            rows whose status is confirmed as 'paid', 'processing', 'shipped',
--            or 'delivered' (never unpaid, pending, cancelled, or failed).
--            It exposes only non-sensitive verification metadata (id, email,
--            country, status, created_at, has_customization).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.validate_order_for_confirmation(
    p_order_id TEXT
)
RETURNS TABLE (
    id TEXT,
    email TEXT,
    country TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    has_customization BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        o.id::TEXT,
        o.email::TEXT,
        COALESCE(o.address->>'country', 'United Kingdom')::TEXT AS country,
        o.status::TEXT,
        o.created_at,
        (COALESCE(o.personalisation_fee, 0) > 0 OR COALESCE(o.requirements_fee, 0) > 0) AS has_customization
    FROM public.orders o
    WHERE o.id = p_order_id
      AND o.status IN ('paid', 'processing', 'shipped', 'delivered')
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_order_for_confirmation(TEXT) TO anon, authenticated;
