-- ==============================================================================
-- Migration: 20261007_repeat_customer_free_delivery.sql
-- Purpose:   Securely check whether an email belongs to a returning/repeat customer
--            to grant complimentary VIP delivery at checkout.
--
-- Security:  SECURITY DEFINER runs with elevated privileges but ONLY returns a
--            boolean (true/false) indicating if there are prior completed orders.
--            No sensitive customer data, addresses, or order items are exposed.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_repeat_customer(
    p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_has_prior_orders BOOLEAN := FALSE;
BEGIN
    IF p_email IS NULL OR TRIM(p_email) = '' THEN
        RETURN FALSE;
    END IF;

    SELECT EXISTS (
        SELECT 1 
        FROM public.orders o
        WHERE LOWER(TRIM(o.email)) = LOWER(TRIM(p_email))
          AND o.status IN ('paid', 'processing', 'shipped', 'delivered', 'completed')
    ) INTO v_has_prior_orders;

    RETURN v_has_prior_orders;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_repeat_customer(TEXT) TO anon, authenticated;
