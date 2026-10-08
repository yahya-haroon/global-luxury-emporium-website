-- ============================================================================
-- 20261008_homepage_categories.sql
-- 100% Admin-Controlled Homepage Category Management
--
-- Enables dynamic, non-fixed categories (e.g. Bomber Jackets, Wool Coats,
-- Shearling Jackets, Biker Jackets, Puffer Jackets, etc.) stored in
-- public.homepage_images with prefix 'hp_cat_' and destination categories.
-- ============================================================================

-- Ensure public.homepage_images table exists
create table if not exists public.homepage_images (
  id            uuid primary key default gen_random_uuid(),
  slot_key      text not null,
  image_url     text,
  storage_path  text,
  alt_text      text,
  title         text,
  description   text,
  product_id    uuid references public.products (id) on delete set null,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  media_type    text not null default 'image',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint homepage_images_slot_key_key unique (slot_key),
  constraint homepage_images_slot_key_not_empty check (slot_key <> '')
);

-- Seed default curated luxury categories if not already present
insert into public.homepage_images (slot_key, title, description, image_url, alt_text, sort_order, is_active)
values
  ('hp_cat_bomber', 'Bomber Jackets', 'bomber', '/assets/models/campaign-racer.webp', 'Handcrafted luxury leather bomber jacket', 1, true),
  ('hp_cat_coats', 'Wool Coats', 'coats', '/assets/products/product-1-main.jpg', 'Tailored luxury double-breasted wool and leather overcoat', 2, true),
  ('hp_cat_shearling', 'Shearling Jackets', 'shearling', '/assets/models/campaign-shearling.webp', 'Plush shearling-lined aviation jacket', 3, true),
  ('hp_cat_biker', 'Biker Jackets', 'biker', '/assets/models/campaign-quilted.webp', 'Artisanal asymmetrical leather biker jacket', 4, true),
  ('hp_cat_puffer', 'Puffer Jackets', 'puffer', '/assets/products/product-2-main.jpg', 'Diamond-quilted insulated leather puffer jacket', 5, true)
on conflict (slot_key) do nothing;
