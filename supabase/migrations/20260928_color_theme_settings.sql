-- ============================================================================
-- 20260928_color_theme_settings.sql
-- Adds customizable brand color theme support to the public.settings table.
-- Allows the store owner to select luxury presets or customize hex colors
-- (accent gold, background ivory, text, muted copy, and borders).
-- ============================================================================

alter table public.settings
  add column if not exists theme jsonb not null default '{
    "name": "Classic Atelier Gold & Warm Ivory",
    "primary": "#9A7628",
    "secondary": "#C9A24A",
    "background": "#F7F3EA",
    "text": "#141210",
    "muted": "#6D6558",
    "border": "#DDD5C4"
  }'::jsonb;

-- Video & rich media support for homepage slots
alter table public.homepage_images
  add column if not exists media_type text not null default 'image';
