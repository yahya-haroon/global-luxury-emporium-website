import { supabase, isSupabaseConfigured } from './supabase';

export type MediaType = 'image' | 'video';

export interface HomepageImage {
  id: string;
  slot_key: string;
  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  title: string | null;
  description: string | null;
  product_id: string | null;
  is_active: boolean;
  sort_order: number;
  media_type?: MediaType;
  created_at: string;
  updated_at: string;
}

export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith('data:video/');
}

export function isVideoMedia(row?: { media_type?: string | null; image_url?: string | null } | null): boolean {
  if (!row) return false;
  if (row.media_type === 'video') return true;
  return isVideoUrl(row.image_url);
}

export type HomepageSlotKind = 'image' | 'slide' | 'product';

export interface HomepageSlotDef {
  key: string;
  section: string;
  label: string;
  kind: HomepageSlotKind;
  defaultUrl: string | null;
  defaultAlt: string;
}

export const HOMEPAGE_SLOT_SECTIONS = [
  'Header',
  'Hero',
  'Editorial',
  'Categories',
  'Why Choose',
  'Featured Products',
  'Leather Guide',
] as const;

export const HOMEPAGE_SLOTS: HomepageSlotDef[] = [
  {
    key: 'header_logo',
    section: 'Header',
    label: 'Header logo',
    kind: 'image',
    defaultUrl: '/assets/logo-round.png',
    defaultAlt: 'Global Luxury Emporium Logo',
  },
  {
    key: 'hero_men',
    section: 'Hero',
    label: 'For Men hero',
    kind: 'image',
    defaultUrl: '/assets/models/campaign-racer.png',
    defaultAlt: 'Male model wearing a classic black racer leather jacket',
  },
  {
    key: 'hero_women',
    section: 'Hero',
    label: 'For Women hero',
    kind: 'image',
    defaultUrl: '/assets/models/campaign-shearling.jpg',
    defaultAlt: 'Female model wearing a shearling aviator leather jacket',
  },
  {
    key: 'editorial_story',
    section: 'Editorial',
    label: 'Editorial story image',
    kind: 'image',
    defaultUrl: '/assets/models/campaign-quilted.jpg',
    defaultAlt: 'Model wearing a quilted burgundy biker leather jacket against a brick wall',
  },
  {
    key: 'category_men',
    section: 'Categories',
    label: "Men's category tile",
    kind: 'image',
    defaultUrl: '/assets/products/product-3-detail.jpg',
    defaultAlt: "Close detail of a men's black racer leather jacket",
  },
  {
    key: 'category_women',
    section: 'Categories',
    label: "Women's category tile",
    kind: 'image',
    defaultUrl: '/assets/products/product-2-detail.jpg',
    defaultAlt: "Close detail of a women's quilted burgundy biker leather jacket",
  },
  {
    key: 'category_1',
    section: 'Categories',
    label: 'Category tile 1',
    kind: 'image',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'category_2',
    section: 'Categories',
    label: 'Category tile 2',
    kind: 'image',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'category_3',
    section: 'Categories',
    label: 'Category tile 3',
    kind: 'image',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'category_4',
    section: 'Categories',
    label: 'Category tile 4',
    kind: 'image',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'why_choose_1',
    section: 'Why Choose',
    label: 'Why Choose slide 1',
    kind: 'slide',
    defaultUrl: '/assets/products/product-1-detail.jpg',
    defaultAlt: 'Close detail of premium leather grain on a Global Luxury Emporium jacket',
  },
  {
    key: 'why_choose_2',
    section: 'Why Choose',
    label: 'Why Choose slide 2',
    kind: 'slide',
    defaultUrl: '/assets/models/model-1.png',
    defaultAlt: 'Model wearing a shearling aviator leather jacket showing hand-finished stitching and hardware',
  },
  {
    key: 'why_choose_3',
    section: 'Why Choose',
    label: 'Why Choose slide 3',
    kind: 'slide',
    defaultUrl: '/assets/models/model-3.png',
    defaultAlt: 'Model wearing a tailored black racer leather jacket',
  },
  {
    key: 'why_choose_4',
    section: 'Why Choose',
    label: 'Why Choose slide 4',
    kind: 'slide',
    defaultUrl: '/assets/models/model-2.png',
    defaultAlt: 'Model wearing a made-to-order quilted burgundy leather jacket',
  },
  {
    key: 'why_choose_5',
    section: 'Why Choose',
    label: 'Why Choose slide 5',
    kind: 'slide',
    defaultUrl: '/assets/banner.jpg',
    defaultAlt: 'Three models wearing Global Luxury Emporium leather jackets, ready for worldwide delivery',
  },
  {
    key: 'why_choose_6',
    section: 'Why Choose',
    label: 'Why Choose slide 6',
    kind: 'slide',
    defaultUrl: '/assets/models/model-quilted.png',
    defaultAlt: 'Close view of a quilted burgundy leather jacket showing the weight and finish of the hide',
  },
  {
    key: 'featured_1',
    section: 'Featured Products',
    label: 'Featured highlight 1',
    kind: 'product',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'featured_2',
    section: 'Featured Products',
    label: 'Featured highlight 2',
    kind: 'product',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'featured_3',
    section: 'Featured Products',
    label: 'Featured highlight 3',
    kind: 'product',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'featured_4',
    section: 'Featured Products',
    label: 'Featured highlight 4',
    kind: 'product',
    defaultUrl: null,
    defaultAlt: '',
  },
  {
    key: 'leather_guide',
    section: 'Leather Guide',
    label: 'Leather guide image (optional)',
    kind: 'image',
    defaultUrl: null,
    defaultAlt: '',
  },
];

export const slotDef = (key: string): HomepageSlotDef | undefined =>
  HOMEPAGE_SLOTS.find((s) => s.key === key);

// Bundled Why Choose slide copy, used when the homepage_images table is empty
// (e.g. before the migration is applied).
export const DEFAULT_WHY_SLIDES: { key: string; title: string; text: string; img: string; alt: string }[] = [
  {
    key: 'why_choose_1',
    title: 'Premium Genuine Leather',
    text: 'Every piece begins with carefully selected real leather, chosen for its grain, suppleness and depth of colour.',
    img: '/assets/products/product-1-detail.jpg',
    alt: 'Close detail of premium leather grain on a Global Luxury Emporium jacket',
  },
  {
    key: 'why_choose_2',
    title: 'Handcrafted Quality',
    text: 'Stitching, lining and hardware are assembled and finished by hand in our own workshop, with close attention at every seam.',
    img: '/assets/models/model-1.png',
    alt: 'Model wearing a shearling aviator leather jacket showing hand-finished stitching and hardware',
  },
  {
    key: 'why_choose_3',
    title: 'Tailored Fit',
    text: 'Available sizes and options let you shape the jacket to you — a fit that feels considered, not off the rack.',
    img: '/assets/models/model-3.png',
    alt: 'Model wearing a tailored black racer leather jacket',
  },
  {
    key: 'why_choose_4',
    title: 'Made to Order',
    text: 'Many pieces are prepared to your selections, including personalisation, and readied before they ship to you.',
    img: '/assets/models/model-2.png',
    alt: 'Model wearing a made-to-order quilted burgundy leather jacket',
  },
  {
    key: 'why_choose_5',
    title: 'Worldwide Delivery',
    text: 'From our door to yours, wherever that is — international shipping with the delivery option chosen at checkout.',
    img: '/assets/banner.jpg',
    alt: 'Three models wearing Global Luxury Emporium leather jackets, ready for worldwide delivery',
  },
  {
    key: 'why_choose_6',
    title: 'Quality You Can Feel',
    text: 'The weight of the hide, the softness of the lining, the final finish — made for comfort, durability and everyday wear.',
    img: '/assets/models/model-quilted.png',
    alt: 'Close view of a quilted burgundy leather jacket showing the weight and finish of the hide',
  },
];

// Studio portraits used by the category product tiles when no slot is configured.
export const DEFAULT_CATEGORY_TILE_IMAGES: Record<string, string> = {
  'a1b2c3d4-e5f6-4a1b-8c2d-111111111111': '/assets/products/product-1-main.jpg',
  'a1b2c3d4-e5f6-4a1b-8c2d-222222222222': '/assets/products/product-2-main.jpg',
  'a1b2c3d4-e5f6-4a1b-8c2d-333333333333': '/assets/products/product-3-main.jpg',
};

// Alternate studio angles used by the dark featured band when no slot is configured.
export const DEFAULT_FEATURED_IMAGES: Record<string, string> = {
  'a1b2c3d4-e5f6-4a1b-8c2d-111111111111': '/assets/products/shearling-aviator-jacket-hover.png',
  'a1b2c3d4-e5f6-4a1b-8c2d-222222222222': '/assets/products/quilted-burgundy-biker-jacket-hover.png',
  'a1b2c3d4-e5f6-4a1b-8c2d-333333333333': '/assets/products/classic-black-racer-jacket-hover.png',
};

export const HOMEPAGE_IMAGE_BUCKET = 'homepage-images';
const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

export function validateHomepageImageFile(file: File): string | null {
  const isVideo = file.type.startsWith('video/') || ACCEPTED_VIDEO_TYPES.includes(file.type);
  const isImage = file.type.startsWith('image/') || ACCEPTED_IMAGE_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return 'Unsupported format. Please upload an image (JPG, PNG, WebP) or video (MP4, WebM, MOV).';
  }

  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return 'Video is too large. Maximum size is 60 MB.';
  }

  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return 'Image is too large. Maximum size is 15 MB.';
  }

  return null;
}

export async function fetchHomepageImages(): Promise<HomepageImage[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('homepage_images')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    // Table may not exist yet (migration not applied) — homepage falls back to defaults.
    console.warn('Homepage images fetch notice (table may need migration):', error.message);
    return [];
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    slot_key: r.slot_key,
    image_url: r.image_url || null,
    storage_path: r.storage_path || null,
    alt_text: r.alt_text ?? null,
    title: r.title ?? null,
    description: r.description ?? null,
    product_id: r.product_id || null,
    is_active: r.is_active ?? true,
    sort_order: Number(r.sort_order || 0),
    media_type: (r.media_type as MediaType) || (isVideoUrl(r.image_url) ? 'video' : 'image'),
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function uploadHomepageImage(
  file: File,
  slotKey: string
): Promise<{ publicUrl: string; storagePath: string }> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Images cannot be uploaded.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `homepage/${slotKey}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(HOMEPAGE_IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(HOMEPAGE_IMAGE_BUCKET).getPublicUrl(storagePath);
  return { publicUrl: data.publicUrl, storagePath };
}

export async function deleteHomepageImageObject(storagePath: string): Promise<void> {
  if (!isSupabaseConfigured || !storagePath) return;
  const { error } = await supabase.storage.from(HOMEPAGE_IMAGE_BUCKET).remove([storagePath]);
  if (error) {
    console.warn('Could not delete old homepage image object:', error.message);
  }
}
