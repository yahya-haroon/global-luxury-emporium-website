-- ============================================================================
-- 20261011_custom_design_requests.sql
-- Custom Jacket & Coat Design Requests System for Global Luxury Emporium Ltd
--
-- Features:
--   * public.custom_design_requests table
--   * Row Level Security (RLS) policies:
--       - Public (anon + authenticated) can INSERT requests with status = 'new'.
--       - Anonymous users CANNOT read other customers' requests.
--       - Owner ('yahyaharoon77@gmail.com') has full access (SELECT, UPDATE, DELETE).
--   * Private Storage bucket 'custom-design-references' for customer reference images
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.custom_design_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL,
    preferred_contact TEXT NOT NULL DEFAULT 'email',
    
    garment_length TEXT NOT NULL,
    garment_style TEXT NOT NULL,
    custom_style_description TEXT,
    
    outer_material TEXT NOT NULL,
    outer_color TEXT NOT NULL,
    custom_outer_color TEXT,
    
    lining_material TEXT NOT NULL,
    lining_color TEXT NOT NULL,
    custom_lining_color TEXT,
    
    design_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    sizing_mode TEXT NOT NULL DEFAULT 'standard',
    sizing_unit TEXT NOT NULL DEFAULT 'inches',
    standard_size TEXT,
    fit_preference TEXT,
    custom_measurements JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    reference_images JSONB NOT NULL DEFAULT '[]'::jsonb,
    special_instructions TEXT,
    
    quote_amount NUMERIC(10, 2),
    quote_currency TEXT DEFAULT '£',
    quote_notes TEXT,
    quoted_at TIMESTAMPTZ,
    admin_notes TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT custom_design_requests_status_check
        CHECK (status IN (
            'new',
            'under_review',
            'more_info_needed',
            'quote_prepared',
            'quote_sent',
            'approved',
            'in_production',
            'completed',
            'declined'
        )),

    CONSTRAINT custom_design_requests_contact_check
        CHECK (preferred_contact IN ('email', 'whatsapp', 'phone')),

    CONSTRAINT custom_design_requests_sizing_mode_check
        CHECK (sizing_mode IN ('standard', 'custom')),

    CONSTRAINT custom_design_requests_sizing_unit_check
        CHECK (sizing_unit IN ('cm', 'inches'))
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_custom_design_requests_status
    ON public.custom_design_requests (status);

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_ref
    ON public.custom_design_requests (reference_number);

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_email
    ON public.custom_design_requests (email);

CREATE INDEX IF NOT EXISTS idx_custom_design_requests_created_at
    ON public.custom_design_requests (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.custom_design_requests ENABLE ROW LEVEL SECURITY;

-- 1. Public Insert: Customers can submit designs (status must be 'new' and admin fields must be null)
DROP POLICY IF EXISTS "Public insert custom design requests" ON public.custom_design_requests;
CREATE POLICY "Public insert custom design requests"
ON public.custom_design_requests
FOR INSERT
TO public
WITH CHECK (
    status = 'new'
    AND quote_amount IS NULL
    AND quote_notes IS NULL
    AND quoted_at IS NULL
    AND admin_notes IS NULL
);

-- 2. Owner Full Management: Only authenticated store owner can view, update, delete requests
DROP POLICY IF EXISTS "Owner manage custom design requests" ON public.custom_design_requests;
CREATE POLICY "Owner manage custom design requests"
ON public.custom_design_requests
FOR ALL
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- 3. Storage Bucket Configuration (Private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('custom-design-references', 'custom-design-references', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public can upload customer reference images
DROP POLICY IF EXISTS "Public upload design references" ON storage.objects;
CREATE POLICY "Public upload design references"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'custom-design-references');

-- Storage Policy: Owner can view/manage customer reference images
DROP POLICY IF EXISTS "Owner read design references" ON storage.objects;
CREATE POLICY "Owner read design references"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'custom-design-references'
    AND auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
);
