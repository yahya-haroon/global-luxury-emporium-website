import { HomepageImage } from './homepageImages';

export interface CustomCategoryData {
  id: string;
  slug: string;
  name: string;
  description?: string;
  image_url?: string;
  storage_path?: string;
  is_custom: boolean;
  sort_order: number;
  product_ids: string[];
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const STORE_CAT_PREFIX = 'store_cat_';

/**
 * Generate a URL-safe lowercase slug from a human-readable title.
 */
export function slugifyCategory(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parses custom store categories stored in the homepage_images table.
 * Metadata such as product_ids, is_custom, and slug are packed in alt_text JSON.
 */
export function parseCustomCategories(rows: HomepageImage[]): CustomCategoryData[] {
  const customRows = rows.filter((r) => r.slot_key.startsWith(STORE_CAT_PREFIX));

  return customRows.map((r, index) => {
    let meta: { product_ids?: string[]; is_custom?: boolean; slug?: string } = {};
    if (r.alt_text) {
      try {
        meta = JSON.parse(r.alt_text);
      } catch {
        meta = {};
      }
    }

    const rawSlug = meta.slug || r.slot_key.replace(STORE_CAT_PREFIX, '');
    const slug = slugifyCategory(rawSlug || r.title || `cat-${index}`);

    return {
      id: r.id || `custom_${slug}`,
      slug,
      name: r.title || slug,
      description: r.description || '',
      image_url: r.image_url || '',
      storage_path: r.storage_path || '',
      is_custom: meta.is_custom ?? true,
      sort_order: r.sort_order ?? index + 1,
      product_ids: Array.isArray(meta.product_ids) ? meta.product_ids : [],
      is_active: r.is_active ?? true,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}
