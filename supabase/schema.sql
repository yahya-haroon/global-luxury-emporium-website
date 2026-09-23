-- ====================================================================
-- Global Luxury Emporium - Supabase Database Schema & Storage Policies
-- Owner Email: yahyaharoon77@gmail.com
-- ====================================================================

-- 1. Create Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Settings Table (Single Row Configuration)
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    currency TEXT NOT NULL DEFAULT '£',
    whatsapp TEXT NOT NULL DEFAULT '+923278434142',
    contact_email TEXT NOT NULL DEFAULT 'globalluxuryemporium@gmail.com',
    address TEXT NOT NULL DEFAULT 'London, United Kingdom',
    company_number TEXT DEFAULT '',
    instagram_url TEXT DEFAULT 'https://www.instagram.com/global_luxury_emporium',
    facebook_url TEXT DEFAULT 'https://www.facebook.com/share/19Kwj7GJHw/',
    personalisation_enabled BOOLEAN NOT NULL DEFAULT true,
    personalisation_charge BOOLEAN NOT NULL DEFAULT false,
    personalisation_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    personalisation_label TEXT NOT NULL DEFAULT 'Personalise your jacket',
    personalisation_hint TEXT NOT NULL DEFAULT 'Name or initials, up to 30 characters',
    requirements_enabled BOOLEAN NOT NULL DEFAULT true,
    requirements_charge BOOLEAN NOT NULL DEFAULT false,
    requirements_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    requirements_label TEXT NOT NULL DEFAULT 'Additional requirements',
    requirements_hint TEXT NOT NULL DEFAULT 'Anything else we should know (up to 110 characters)',
    delivery_zones JSONB NOT NULL DEFAULT '[
        {"id": "uk", "name": "United Kingdom", "price": 0.00},
        {"id": "row", "name": "Rest of world", "price": 0.00}
    ]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    category TEXT NOT NULL DEFAULT 'Women',
    description TEXT NOT NULL DEFAULT '',
    sizes TEXT NOT NULL DEFAULT 'XS, S, M, L, XL',
    options JSONB DEFAULT '[]'::jsonb,
    images TEXT[] NOT NULL DEFAULT '{}',
    allow_personalisation BOOLEAN NOT NULL DEFAULT false,
    allow_requirements BOOLEAN NOT NULL DEFAULT false,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    address JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    stripe_payment_intent_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 5. Settings RLS Policies
-- Public can read settings
DROP POLICY IF EXISTS "Allow public read settings" ON public.settings;
CREATE POLICY "Allow public read settings"
ON public.settings FOR SELECT
TO public
USING (true);

-- Only authenticated owner can insert/update/delete settings
DROP POLICY IF EXISTS "Allow owner insert settings" ON public.settings;
CREATE POLICY "Allow owner insert settings"
ON public.settings FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

DROP POLICY IF EXISTS "Allow owner update settings" ON public.settings;
CREATE POLICY "Allow owner update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

DROP POLICY IF EXISTS "Allow owner delete settings" ON public.settings;
CREATE POLICY "Allow owner delete settings"
ON public.settings FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- 6. Products RLS Policies
-- Public can read visible products; owner can read all
DROP POLICY IF EXISTS "Allow public read visible products" ON public.products;
CREATE POLICY "Allow public read visible products"
ON public.products FOR SELECT
TO public
USING (is_visible = true OR (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'));

-- Only authenticated owner can insert products
DROP POLICY IF EXISTS "Allow owner insert products" ON public.products;
CREATE POLICY "Allow owner insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- Only authenticated owner can update products
DROP POLICY IF EXISTS "Allow owner update products" ON public.products;
CREATE POLICY "Allow owner update products"
ON public.products FOR UPDATE
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
WITH CHECK (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- Only authenticated owner can delete products
DROP POLICY IF EXISTS "Allow owner delete products" ON public.products;
CREATE POLICY "Allow owner delete products"
ON public.products FOR DELETE
TO authenticated
USING (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- 7. Orders RLS Policies
-- Allow anyone to insert orders
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

-- 7. Supabase Storage Bucket & Policies
-- Create public-read bucket for product-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public can view files in product-images bucket
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Only owner can upload files to product-images bucket
DROP POLICY IF EXISTS "Owner can upload product images" ON storage.objects;
CREATE POLICY "Owner can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images' 
    AND (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
);

-- Only owner can update files in product-images bucket
DROP POLICY IF EXISTS "Owner can update product images" ON storage.objects;
CREATE POLICY "Owner can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'product-images' 
    AND (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
);

-- Only owner can delete files in product-images bucket
DROP POLICY IF EXISTS "Owner can delete product images" ON storage.objects;
CREATE POLICY "Owner can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'product-images' 
    AND (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
);

-- 8. Seed Default Settings
INSERT INTO public.settings (
    id,
    currency,
    whatsapp,
    contact_email,
    address,
    company_number,
    instagram_url,
    facebook_url,
    personalisation_enabled,
    personalisation_charge,
    personalisation_price,
    personalisation_label,
    personalisation_hint,
    requirements_enabled,
    requirements_charge,
    requirements_price,
    requirements_label,
    requirements_hint
) VALUES (
    'default',
    '£',
    '+923278434142',
    'globalluxuryemporium@gmail.com',
    'London, United Kingdom',
    '',
    'https://www.instagram.com/global_luxury_emporium',
    'https://www.facebook.com/share/19Kwj7GJHw/',
    true,
    false,
    0.00,
    'Personalise your jacket',
    'Name or initials, up to 30 characters',
    true,
    false,
    0.00,
    'Additional requirements',
    'Anything else we should know (up to 110 characters)'
) ON CONFLICT (id) DO NOTHING;

-- 9. Seed 3 Sample Products (Using placeholder image crops)
INSERT INTO public.products (
    id,
    name,
    price,
    category,
    description,
    sizes,
    images,
    allow_personalisation,
    allow_requirements,
    link,
    link_p,
    link_r,
    link_pr,
    is_visible,
    sort_order
) VALUES 
(
    'a1b2c3d4-e5f6-4a1b-8c2d-111111111111',
    'Shearling Aviator Jacket',
    349.00,
    'Women',
    'Handcrafted from supple calfskin leather with a plush shearling collar and wool lining. Designed in London, cut and finished in our dedicated factory in Pakistan for lifetime durability.',
    'XS, S, M, L, XL',
    ARRAY['/assets/products/shearling-aviator-jacket-main.png', '/assets/products/shearling-aviator-jacket-hover.png'],
    true,
    true,
    '',
    '',
    '',
    '',
    true,
    1
),
(
    'a1b2c3d4-e5f6-4a1b-8c2d-222222222222',
    'Quilted Burgundy Biker Jacket',
    299.00,
    'Women',
    'Premium full-grain burgundy leather with distinctive diamond-quilted shoulders, asymmetrical antique brass zip, and contoured ergonomic fit. An iconic British silhouette crafted to perfection.',
    'XS, S, M, L, XL',
    ARRAY['/assets/products/quilted-burgundy-biker-jacket-main.png', '/assets/products/quilted-burgundy-biker-jacket-hover.png'],
    true,
    true,
    '',
    '',
    '',
    '',
    true,
    2
),
(
    'a1b2c3d4-e5f6-4a1b-8c2d-333333333333',
    'Classic Black Racer Jacket',
    319.00,
    'Men',
    'Minimalist café racer styling engineered from heavyweight black steerhide. Features a clean band collar, storm flap, and reinforced stitching for the modern gentleman with global ambition.',
    'S, M, L, XL, XXL',
    ARRAY['/assets/products/classic-black-racer-jacket-main.png', '/assets/products/classic-black-racer-jacket-hover.png'],
    true,
    true,
    '',
    '',
    '',
    '',
    true,
    3
)
ON CONFLICT (id) DO NOTHING;
-- ====================================================================
-- 10. Orders
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id                TEXT            NOT NULL,
    product_name              TEXT            NOT NULL,
    size                      TEXT            NOT NULL,
    selected_options          JSONB           NOT NULL DEFAULT '{}'::jsonb,
    personalisation_text      TEXT            NOT NULL DEFAULT '',
    personalisation_fee       NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
    requirements_text         TEXT            NOT NULL DEFAULT '',
    requirements_fee          NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
    delivery_zone             TEXT            NOT NULL,
    delivery_price            NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
    product_price             NUMERIC(10,2)   NOT NULL,
    total_amount              NUMERIC(10,2)   NOT NULL,
    currency                  TEXT            NOT NULL DEFAULT '£',
    customer_name             TEXT            NOT NULL,
    email                     TEXT            NOT NULL,
    address                   JSONB           NOT NULL,
    status                    TEXT            NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'failed')),
    stripe_payment_intent_id  TEXT            NOT NULL,
    created_at                TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at                TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- ====================================================================
-- 11. Order Items
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    order_id UUID NOT NULL
        REFERENCES public.orders(id) ON DELETE CASCADE,

    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE RESTRICT,

    quantity INTEGER NOT NULL DEFAULT 1
        CHECK (quantity > 0),

    -- Keep the product information as it was when purchased
    product_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 12. Reviews
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    product_id UUID NOT NULL
        REFERENCES public.products(id) ON DELETE CASCADE,

    order_item_id UUID NOT NULL
        REFERENCES public.order_items(id) ON DELETE CASCADE,

    customer_id UUID NOT NULL
        REFERENCES auth.users(id) ON DELETE CASCADE,

    rating INTEGER NOT NULL
        CHECK (rating >= 1 AND rating <= 5),

    review TEXT NOT NULL
        CHECK (char_length(review) >= 1 AND char_length(review) <= 3000),

    published BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One review per purchased item
    CONSTRAINT one_review_per_order_item
        UNIQUE (order_item_id)
);

-- ====================================================================
-- 13. Enable RLS
-- ====================================================================

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;


-- ====================================================================
-- 14. Orders RLS
-- ====================================================================

DROP POLICY IF EXISTS "Customers can view their own orders"
ON public.orders;

CREATE POLICY "Customers can view their own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
);


-- ====================================================================
-- 15. Order Items RLS
-- ====================================================================

DROP POLICY IF EXISTS "Customers can view their own order items"
ON public.order_items;

CREATE POLICY "Customers can view their own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.orders o
        WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
);


-- ====================================================================
-- 16. Reviews - Public Reading
-- ====================================================================

DROP POLICY IF EXISTS "Anyone can read published reviews"
ON public.reviews;

CREATE POLICY "Anyone can read published reviews"
ON public.reviews
FOR SELECT
TO public
USING (
    published = true
);


-- ====================================================================
-- 17. Reviews - Verified Purchase Only
-- ====================================================================

DROP POLICY IF EXISTS "Verified customers can write reviews"
ON public.reviews;

CREATE POLICY "Verified customers can write reviews"
ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (

    -- Review must belong to the logged-in customer
    customer_id = auth.uid()

    AND

    -- The order item must belong to that customer
    EXISTS (
        SELECT 1
        FROM public.order_items oi
        INNER JOIN public.orders o
            ON o.id = oi.order_id
        WHERE oi.id = reviews.order_item_id
        AND oi.product_id = reviews.product_id
        AND o.customer_id = auth.uid()
        AND o.status = 'paid'
    )
);


-- ====================================================================
-- 18. Customers Can Edit Their Own Reviews
-- ====================================================================

DROP POLICY IF EXISTS "Customers can update their own reviews"
ON public.reviews;

CREATE POLICY "Customers can update their own reviews"
ON public.reviews
FOR UPDATE
TO authenticated
USING (
    customer_id = auth.uid()
)
WITH CHECK (
    customer_id = auth.uid()
);


-- ====================================================================
-- 19. Customers Can Delete Their Own Reviews
-- ====================================================================

DROP POLICY IF EXISTS "Customers can delete their own reviews"
ON public.reviews;

CREATE POLICY "Customers can delete their own reviews"
ON public.reviews
FOR DELETE
TO authenticated
USING (
    customer_id = auth.uid()
);


-- ====================================================================
-- 20. Owner Can Manage Reviews
-- ====================================================================

DROP POLICY IF EXISTS "Owner can manage reviews"
ON public.reviews;

CREATE POLICY "Owner can manage reviews"
ON public.reviews
FOR ALL
TO authenticated
USING (
    auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
)
WITH CHECK (
    auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
);
-- ====================================================================
-- GLOBAL LUXURY EMPORIUM
-- PRODUCT OPTIONS + ORDER ITEM SELECTED OPTIONS
-- ====================================================================

-- ====================================================================
-- 1. PRODUCT OPTIONS
-- ====================================================================
-- Flexible JSON structure allowing:
-- Size, Color, Leather, Lining, Style, etc.
--
-- Example:
-- [
--   {
--     "name": "Size",
--     "type": "select",
--     "required": true,
--     "values": ["XS", "S", "M", "L", "XL"]
--   },
--   {
--     "name": "Color",
--     "type": "select",
--     "required": true,
--     "values": ["Black", "Brown", "Burgundy"]
--   }
-- ]

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Make sure options is always a JSON array
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_options_is_array;

ALTER TABLE public.products
ADD CONSTRAINT products_options_is_array
CHECK (jsonb_typeof(options) = 'array');


-- ====================================================================
-- 2. SELECTED OPTIONS ON ORDER ITEMS
-- ====================================================================
-- Stores exactly what the customer selected when they purchased.
--
-- Example:
-- {
--   "Size": "XL",
--   "Color": "Black",
--   "Leather": "Sheepskin",
--   "Lining": "Shearling"
-- }

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS selected_options JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Make sure selected_options is always a JSON object
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_selected_options_is_object;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_selected_options_is_object
CHECK (jsonb_typeof(selected_options) = 'object');


-- ====================================================================
-- 3. INDEXES
-- ====================================================================
-- Makes searching/filtering JSON options more efficient.

CREATE INDEX IF NOT EXISTS products_options_gin_idx
ON public.products
USING GIN (options);

CREATE INDEX IF NOT EXISTS order_items_selected_options_gin_idx
ON public.order_items
USING GIN (selected_options);


-- ====================================================================
-- 4. OPTIONAL: VERIFY THE NEW COLUMNS
-- ====================================================================
-- These queries don't modify anything. They simply let you confirm
-- that the columns exist after the migration.

SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name = 'options';

SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'order_items'
  AND column_name = 'selected_options';
  