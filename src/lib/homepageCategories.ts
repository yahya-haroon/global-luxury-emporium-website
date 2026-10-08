import { CategorySlug, isCategorySlug } from './categories';
import { HomepageImage } from './homepageImages';

export interface HomepageCategory {
  id: string;
  name: string;
  slug: string;
  destination_category: CategorySlug;
  image_url: string | null;
  storage_path: string | null;
  alt_text: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Curated luxury fallback categories displayed when no custom categories
 * have been configured in Supabase yet.
 */
export const DEFAULT_HOMEPAGE_CATEGORIES: HomepageCategory[] = [
  {
    id: 'bomber',
    name: 'Bomber Jackets',
    slug: 'bomber',
    destination_category: 'bomber',
    image_url: '/assets/models/campaign-racer.webp',
    storage_path: null,
    alt_text: 'Handcrafted luxury leather bomber jacket',
    display_order: 1,
    is_active: true,
  },
  {
    id: 'coats',
    name: 'Wool Coats',
    slug: 'coats',
    destination_category: 'coats',
    image_url: '/assets/products/product-1-main.jpg',
    storage_path: null,
    alt_text: 'Tailored luxury double-breasted wool and leather overcoat',
    display_order: 2,
    is_active: true,
  },
  {
    id: 'shearling',
    name: 'Shearling Jackets',
    slug: 'shearling',
    destination_category: 'shearling',
    image_url: '/assets/models/campaign-shearling.webp',
    storage_path: null,
    alt_text: 'Plush shearling-lined aviation jacket',
    display_order: 3,
    is_active: true,
  },
  {
    id: 'biker',
    name: 'Biker Jackets',
    slug: 'biker',
    destination_category: 'biker',
    image_url: '/assets/models/campaign-quilted.webp',
    storage_path: null,
    alt_text: 'Artisanal asymmetrical leather biker jacket',
    display_order: 4,
    is_active: true,
  },
  {
    id: 'puffer',
    name: 'Puffer Jackets',
    slug: 'puffer',
    destination_category: 'puffer',
    image_url: '/assets/products/product-2-main.jpg',
    storage_path: null,
    alt_text: 'Diamond-quilted insulated leather puffer jacket',
    display_order: 5,
    is_active: true,
  },
];

export const HP_CAT_PREFIX = 'hp_cat_';

/**
 * Extracts and parses HomepageCategory items from the Supabase homepage_images table rows.
 * Matches rows whose slot_key begins with 'hp_cat_'.
 */
export function parseHomepageCategories(rows: HomepageImage[]): HomepageCategory[] {
  const catRows = rows.filter((r) => r.slot_key.startsWith(HP_CAT_PREFIX));

  if (catRows.length === 0) {
    return DEFAULT_HOMEPAGE_CATEGORIES;
  }

  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const parsed: HomepageCategory[] = [];

  for (const r of catRows) {
    const id = r.slot_key.replace(HP_CAT_PREFIX, '').trim();
    if (!id || seenIds.has(id.toLowerCase())) continue;

    const destination = (r.description || '').trim().toLowerCase();
    const validDest: CategorySlug = isCategorySlug(destination) ? destination : 'all';
    const name = r.title?.trim() || 'Category';

    // Guard against duplicate slot combinations
    const dedupeKey = `${name.toLowerCase()}::${validDest}`;
    if (seenKeys.has(dedupeKey)) continue;

    seenIds.add(id.toLowerCase());
    seenKeys.add(dedupeKey);

    parsed.push({
      id,
      name,
      slug: id,
      destination_category: validDest,
      image_url: r.image_url || null,
      storage_path: r.storage_path || null,
      alt_text: r.alt_text || r.title || 'Category item',
      display_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
      is_active: r.is_active ?? true,
      created_at: r.created_at,
      updated_at: r.updated_at,
    });
  }

  return parsed.sort((a, b) => a.display_order - b.display_order);
}

/**
 * Fallback image when a category image is missing or fails to load.
 */
export function getCategoryFallbackImage(destinationSlug?: string): string {
  switch (destinationSlug) {
    case 'bomber':
      return '/assets/models/campaign-racer.webp';
    case 'coats':
      return '/assets/products/product-1-main.jpg';
    case 'shearling':
    case 'aviator':
      return '/assets/models/campaign-shearling.webp';
    case 'biker':
      return '/assets/models/campaign-quilted.webp';
    case 'puffer':
      return '/assets/products/product-2-main.jpg';
    default:
      return '/assets/models/model-1.png';
  }
}
