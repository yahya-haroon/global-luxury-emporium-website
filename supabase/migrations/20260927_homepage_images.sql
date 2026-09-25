-- ============================================================================
-- 20260927_homepage_images.sql
-- Admin-controlled configuration for every customer-facing homepage image.
--
-- Adds:
--   * public.homepage_images  — one row per homepage slot (slot_key unique)
--   * storage bucket 'homepage-images' (public read, owner write)
--   * RLS: customers (anon/authenticated) may SELECT active rows only.
--          Only the owner email may INSERT / UPDATE / DELETE.
--
-- The Why Choose carousel slides are seeded with the current bundled content
-- (image_url points at existing /assets files, no storage duplication) so the
-- carousel is fully admin-editable immediately after this migration runs.
-- Frontend keeps bundled defaults as fallback when no rows exist, so the
-- homepage never breaks before/without this migration.
-- ============================================================================

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

create index if not exists homepage_images_active_sort_idx
  on public.homepage_images (is_active, sort_order);

alter table public.homepage_images enable row level security;

-- Customers may read the ACTIVE homepage configuration only.
drop policy if exists homepage_images_public_read on public.homepage_images;
create policy homepage_images_public_read
  on public.homepage_images for select
  to anon, authenticated
  using (is_active = true);

-- Owner full control (read incl. inactive rows, insert, update, delete).
drop policy if exists homepage_images_owner_all on public.homepage_images;
create policy homepage_images_owner_all
  on public.homepage_images for all
  to authenticated
  using (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com')
  with check (auth.jwt()->>'email' = 'yahyaharoon77@gmail.com');

-- ----------------------------------------------------------------------------
-- Storage bucket for uploaded homepage images (public read, owner write).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('homepage-images', 'homepage-images', true)
on conflict (id) do nothing;

drop policy if exists homepage_images_storage_public_read on storage.objects;
create policy homepage_images_storage_public_read
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'homepage-images');

drop policy if exists homepage_images_storage_owner_insert on storage.objects;
create policy homepage_images_storage_owner_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'homepage-images'
    and auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
  );

drop policy if exists homepage_images_storage_owner_update on storage.objects;
create policy homepage_images_storage_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'homepage-images'
    and auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
  )
  with check (
    bucket_id = 'homepage-images'
    and auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
  );

drop policy if exists homepage_images_storage_owner_delete on storage.objects;
create policy homepage_images_storage_owner_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'homepage-images'
    and auth.jwt()->>'email' = 'yahyaharoon77@gmail.com'
  );

-- ----------------------------------------------------------------------------
-- Seed the Why Choose carousel slides with the current bundled content.
-- image_url references existing repository assets (no storage duplication);
-- the admin can replace any slide image with an upload afterwards.
-- ----------------------------------------------------------------------------
insert into public.homepage_images
  (slot_key, image_url, storage_path, alt_text, title, description, is_active, sort_order)
values
  (
    'why_choose_1',
    '/assets/products/product-1-detail.jpg',
    null,
    'Close detail of premium leather grain on a Global Luxury Emporium jacket',
    'Premium Genuine Leather',
    'Every piece begins with carefully selected real leather, chosen for its grain, suppleness and depth of colour.',
    true, 0
  ),
  (
    'why_choose_2',
    '/assets/models/model-1.png',
    null,
    'Model wearing a shearling aviator leather jacket showing hand-finished stitching and hardware',
    'Handcrafted Quality',
    'Stitching, lining and hardware are assembled and finished by hand in our own workshop, with close attention at every seam.',
    true, 1
  ),
  (
    'why_choose_3',
    '/assets/models/model-3.png',
    null,
    'Model wearing a tailored black racer leather jacket',
    'Tailored Fit',
    'Available sizes and options let you shape the jacket to you — a fit that feels considered, not off the rack.',
    true, 2
  ),
  (
    'why_choose_4',
    '/assets/models/model-2.png',
    null,
    'Model wearing a made-to-order quilted burgundy leather jacket',
    'Made to Order',
    'Many pieces are prepared to your selections, including personalisation, and readied before they ship to you.',
    true, 3
  ),
  (
    'why_choose_5',
    '/assets/banner.jpg',
    null,
    'Three models wearing Global Luxury Emporium leather jackets, ready for worldwide delivery',
    'Worldwide Delivery',
    'From our door to yours, wherever that is — international shipping with the delivery option chosen at checkout.',
    true, 4
  ),
  (
    'why_choose_6',
    '/assets/models/model-quilted.png',
    null,
    'Close view of a quilted burgundy leather jacket showing the weight and finish of the hide',
    'Quality You Can Feel',
    'The weight of the hide, the softness of the lining, the final finish — made for comfort, durability and everyday wear.',
    true, 5
  )
on conflict (slot_key) do nothing;
