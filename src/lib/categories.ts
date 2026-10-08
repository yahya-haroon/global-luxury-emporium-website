import { Product } from '../types';

export type Gender = 'men' | 'women';
export type GenderFilter = 'all' | 'men' | 'women';

import { CustomCategoryData } from './storeCategories';

export type BuiltInCategorySlug =
  | 'all'
  | 'biker'
  | 'bomber'
  | 'aviator'
  | 'puffer'
  | 'shearling'
  | 'racer'
  | 'varsity'
  | 'casual'
  | 'coats';

export type CategorySlug = BuiltInCategorySlug | string;

export interface CategoryDefinition {
  slug: CategorySlug;
  name: string;
  title: string;
  metaTitle: (gender: GenderFilter) => string;
  metaDescription: (gender: GenderFilter) => string;
  headline: (gender: GenderFilter) => string;
  subheadline: string;
  matches: (product: Product) => boolean;
  isCustom?: boolean;
}

export const VALID_CATEGORY_SLUGS: BuiltInCategorySlug[] = [
  'all',
  'biker',
  'bomber',
  'aviator',
  'puffer',
  'shearling',
  'racer',
  'varsity',
  'casual',
  'coats',
];

export function isCategorySlug(slug: string, customCategories: CustomCategoryData[] = []): boolean {
  if (VALID_CATEGORY_SLUGS.includes(slug as BuiltInCategorySlug)) return true;
  return customCategories.some((c) => c.slug.toLowerCase() === slug.toLowerCase());
}

/**
 * Derives Gender from existing product fields (category, name, description, gender).
 * Guarantees a strict 'men' or 'women' classification so collections are never mixed.
 */
export function deriveProductGender(product: Product): Gender {
  // 1. If explicit gender field is on the product
  const rawGender = (product as any).gender;
  if (typeof rawGender === 'string') {
    const g = rawGender.trim().toLowerCase();
    if (g === 'women' || g === 'female' || g === 'woman') return 'women';
    if (g === 'men' || g === 'male' || g === 'man') return 'men';
  }

  // 2. Check existing database category column (often 'Men' or 'Women')
  const cat = (product.category || '').trim().toLowerCase();
  if (cat === 'women' || cat === 'woman' || cat === "women's" || cat === 'womens') {
    return 'women';
  }
  if (cat === 'men' || cat === 'man' || cat === "men's" || cat === 'mens') {
    return 'men';
  }

  // 3. Inspect product name and description
  const title = (product.name || '').toLowerCase();
  const desc = (product.description || '').toLowerCase();
  const combined = `${title} ${desc}`;

  const hasWomenInTitle = /\b(women|woman|ladies|womens|women's|lady|female)\b/i.test(title);
  const hasMenInTitle = /\b(men|man|mens|men's|gentleman|gentlemen|male)\b/i.test(title);

  if (hasWomenInTitle && !hasMenInTitle) return 'women';
  if (hasMenInTitle && !hasWomenInTitle) return 'men';

  const hasWomenInBody = /\b(women|woman|ladies|womens|women's|lady|female)\b/i.test(combined);
  const hasMenInBody = /\b(men|man|mens|men's|gentleman|gentlemen|male)\b/i.test(combined);

  if (hasWomenInBody && !hasMenInBody) return 'women';
  if (hasMenInBody && !hasWomenInBody) return 'men';

  // Fallback default: if category contains woman/women, else men
  return cat.includes('women') ? 'women' : 'men';
}

/**
 * Normalizes text for regex searches
 */
function getProductText(product: Product): string {
  return `${product.name || ''} ${product.description || ''}`.toLowerCase();
}

/**
 * Category Definitions with exact matching rules requested:
 * - Biker: biker, motorcycle, moto, motorcycle jacket (never simply "leather")
 * - Bomber: bomber
 * - Aviator: aviator, aviation, pilot, flight, B3, RAF, A2, G1
 * - Puffer: puffer, down, goose down, quilted puffer
 * - Shearling: shearling, sheepskin lined, fur lined, sherpa lined
 * - Racer: racer, cafe racer
 * - Varsity: varsity, letterman, baseball jacket
 * - Coats: coat, long coat, overcoat, trench
 * - Casual: otherwise
 */
export const CATEGORIES: Record<CategorySlug, CategoryDefinition> = {
  all: {
    slug: 'all',
    name: 'All',
    title: 'All Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'All Handcrafted Luxury Leather Jackets & Coats | Global Luxury Emporium'
        : `All Handcrafted Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Explore our complete collection of handcrafted luxury leather jackets and coats. Free worldwide delivery.'
        : `Explore our complete collection of handcrafted luxury leather jackets and coats for ${g === 'men' ? 'men' : 'women'}. Free worldwide delivery.`,
    headline: (g) => (g === 'all' ? 'All Handcrafted Jackets' : `All ${g === 'men' ? "Men's" : "Women's"} Jackets`),
    subheadline:
      'Explore our full curated range of genuine leather jackets, coats, and shearling outerwear.',
    matches: () => true,
  },
  biker: {
    slug: 'biker',
    name: 'Biker',
    title: 'Biker Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Handcrafted Luxury Leather Biker Jackets | Global Luxury Emporium'
        : `Handcrafted Leather Biker Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Explore luxury handcrafted leather biker jackets. Premium calfskin and lambskin with asymmetrical zips and diamond-quilted details. Free worldwide delivery.'
        : `Explore luxury handcrafted leather biker jackets for ${g === 'men' ? 'men' : 'women'}. Premium calfskin and lambskin with asymmetrical zips and diamond-quilted details. Free worldwide delivery.`,
    headline: (g) => (g === 'all' ? 'Biker Jackets' : `${g === 'men' ? "Men's" : "Women's"} Biker Jackets`),
    subheadline:
      'Iconic asymmetrical silhouettes, hand-waxed leather finishes, and artisanal brass hardware.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(biker|motorcycle jacket|motorcycle|moto)\b/i.test(text);
    },
  },
  bomber: {
    slug: 'bomber',
    name: 'Bomber',
    title: 'Bomber Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Luxury Handcrafted Leather Bomber Jackets | Global Luxury Emporium'
        : `Luxury Leather Bomber Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Discover handcrafted luxury leather bomber and flight jackets. Ribbed trims, supple lambskin, and insulated comfort.'
        : `Discover handcrafted luxury leather bomber and flight jackets for ${g === 'men' ? 'men' : 'women'}. Ribbed trims, supple lambskin, and insulated comfort.`,
    headline: (g) => (g === 'all' ? 'Bomber Jackets' : `${g === 'men' ? "Men's" : "Women's"} Bomber Jackets`),
    subheadline:
      'Timeless military heritage crafted with ultra-soft Italian lambskin and tailored comfort.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(bomber)\b/i.test(text);
    },
  },
  aviator: {
    slug: 'aviator',
    name: 'Aviator',
    title: 'Aviator Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Genuine Shearling Aviator & Flying Jackets | Global Luxury Emporium'
        : `Genuine Shearling Aviator & Flying Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Shop luxury shearling aviator and B3 flying jackets. Heavyweight shearling linings and authentic military styling.'
        : `Shop luxury shearling aviator and B3 flying jackets for ${g === 'men' ? 'men' : 'women'}. Heavyweight shearling linings and authentic military styling.`,
    headline: (g) => (g === 'all' ? 'Aviator Jackets' : `${g === 'men' ? "Men's" : "Women's"} Aviator Jackets`),
    subheadline:
      'Authentic B3, RAF, and military flight jackets lined with plush natural shearling.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(b3|b-3|raf|a2|a-2|g1|g-1|aviator|aviation|pilot|flight)\b/i.test(text);
    },
  },
  puffer: {
    slug: 'puffer',
    name: 'Puffer',
    title: 'Puffer Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Luxury Leather Puffer & Down Jackets | Global Luxury Emporium'
        : `Luxury Leather Puffer & Down Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Shop luxury leather puffer jackets, quilted leather coats, and goose down outerwear.'
        : `Shop luxury leather puffer jackets, quilted leather coats, and goose down outerwear for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => (g === 'all' ? 'Puffer Jackets' : `${g === 'men' ? "Men's" : "Women's"} Puffer Jackets`),
    subheadline:
      'Bespoke diamond quilted leather and premium insulated puffer coats.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(puffer|goose down|quilted puffer)\b/i.test(text) || (/\bdown\b/i.test(text) && /\bjacket\b/i.test(text));
    },
  },
  shearling: {
    slug: 'shearling',
    name: 'Shearling',
    title: 'Shearling Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Handcrafted Genuine Shearling & Sheepskin Jackets | Global Luxury Emporium'
        : `Handcrafted Genuine Shearling & Fur Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Discover handcrafted genuine shearling, sheepskin, and fur-collared leather jackets.'
        : `Discover handcrafted genuine shearling, sheepskin, and fur-collared leather jackets for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => (g === 'all' ? 'Shearling Jackets' : `${g === 'men' ? "Men's" : "Women's"} Shearling Jackets`),
    subheadline:
      'Luxurious sheepskin wool linings and plush fur collars crafted for winter warmth.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(shearling|sheepskin lined|fur lined|sherpa lined|sheepskin)\b/i.test(text);
    },
  },
  racer: {
    slug: 'racer',
    name: 'Racer',
    title: 'Racer Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Café Racer Handcrafted Leather Jackets | Global Luxury Emporium'
        : `Café Racer Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Streamlined minimalist café racer leather jackets. Clean mandarin collars and ergonomic fit.'
        : `Streamlined minimalist café racer leather jackets for ${g === 'men' ? 'men' : 'women'}. Clean mandarin collars and ergonomic fit.`,
    headline: (g) => (g === 'all' ? 'Racer Jackets' : `${g === 'men' ? "Men's" : "Women's"} Racer Jackets`),
    subheadline:
      'Streamlined minimalist contours, snap-tab collars, and ergonomic precision.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(cafe racer|racer)\b/i.test(text);
    },
  },
  varsity: {
    slug: 'varsity',
    name: 'Varsity',
    title: 'Varsity Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Luxury Leather Varsity & Baseball Jackets | Global Luxury Emporium'
        : `Luxury Leather Varsity & Baseball Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Collegiate leather varsity and baseball jackets. Contrast two-tone leatherwork and artisan finish.'
        : `Collegiate leather varsity and baseball jackets for ${g === 'men' ? 'men' : 'women'}. Contrast two-tone leatherwork and artisan finish.`,
    headline: (g) => (g === 'all' ? 'Varsity Jackets' : `${g === 'men' ? "Men's" : "Women's"} Varsity Jackets`),
    subheadline:
      'Sporting prestige reimagined in buttery lambskin and contrast artisan leatherwork.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(varsity|letterman|baseball jacket)\b/i.test(text);
    },
  },
  coats: {
    slug: 'coats',
    name: 'Coats',
    title: 'Leather & Wool Coats',
    metaTitle: (g) =>
      g === 'all'
        ? 'Handcrafted Luxury Leather & Wool Coats, Trenches & Overcoats | Global Luxury Emporium'
        : `Handcrafted Leather Coats & Trenches for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Explore extended leather coats, tailored wool overcoats, and trenches. Free worldwide delivery.'
        : `Explore extended leather coats, tailored trenches, and overcoats for ${g === 'men' ? 'men' : 'women'}. Free worldwide delivery.`,
    headline: (g) => (g === 'all' ? 'Coats & Overcoats' : `${g === 'men' ? "Men's" : "Women's"} Leather Coats`),
    subheadline:
      'Elegant extended length, belted silhouettes, and premium full-grain outercoats.',
    matches: (p: Product) => {
      const text = getProductText(p);
      return /\b(long coat|overcoat|trench|coat|coats)\b/i.test(text);
    },
  },
  casual: {
    slug: 'casual',
    name: 'Casual',
    title: 'Casual Jackets',
    metaTitle: (g) =>
      g === 'all'
        ? 'Casual & Everyday Luxury Leather Jackets | Global Luxury Emporium'
        : `Casual & Everyday Luxury Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      g === 'all'
        ? 'Versatile casual leather jackets, blazers, and field jackets for every day.'
        : `Versatile casual leather jackets, blazers, and field jackets for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => (g === 'all' ? 'Casual Jackets' : `${g === 'men' ? "Men's" : "Women's"} Casual Jackets`),
    subheadline:
      'Effortless leather blazers, utility field silhouettes, and relaxed everyday designs.',
    matches: (p: Product) => {
      // Matches products that have casual/everyday keywords OR do not match other specific categories
      const text = getProductText(p);
      if (/\b(casual|everyday|classic|blazer|hoodie|field)\b/i.test(text)) {
        return true;
      }
      // Check if it matched any of the other 8 categories
      const matchedOther = (['biker', 'bomber', 'aviator', 'puffer', 'shearling', 'racer', 'varsity', 'coats'] as CategorySlug[]).some(
        (slug) => CATEGORIES[slug].matches(p)
      );
      return !matchedOther;
    },
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategoryBySlug(
  slug: string,
  customCategories: CustomCategoryData[] = []
): CategoryDefinition | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  const builtIn = CATEGORIES[normalized as BuiltInCategorySlug];
  if (builtIn) return builtIn;

  // Search among custom categories
  const custom = customCategories.find((c) => c.slug.toLowerCase() === normalized);
  if (custom) {
    return {
      slug: custom.slug,
      name: custom.name,
      title: custom.name,
      isCustom: true,
      metaTitle: (g) =>
        g === 'all'
          ? `${custom.name} | Handcrafted Luxury | Global Luxury Emporium`
          : `${custom.name} for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
      metaDescription: (g) =>
        custom.description ||
        `Explore handcrafted luxury ${custom.name.toLowerCase()} for ${g === 'all' ? 'men and women' : g}. Free worldwide delivery.`,
      headline: (g) =>
        g === 'all' ? custom.name : `${g === 'men' ? "Men's" : "Women's"} ${custom.name}`,
      subheadline:
        custom.description ||
        `Handcrafted luxury ${custom.name.toLowerCase()} tailored from finest materials.`,
      matches: (p) => productMatchesCategory(p, custom.slug, customCategories),
    };
  }

  return undefined;
}

/**
 * Returns all available categories: default built-ins plus any active custom categories.
 */
export function getAllCategories(
  customCategories: CustomCategoryData[] = []
): CategoryDefinition[] {
  const customDefs = customCategories
    .filter((c) => c.is_active !== false)
    .map((c) => getCategoryBySlug(c.slug, customCategories))
    .filter((c): c is CategoryDefinition => Boolean(c));

  return [...CATEGORY_LIST, ...customDefs];
}

/**
 * Checks if a product matches a given category slug:
 * 1. Explicit product_ids assignment in category metadata (highest priority).
 * 2. Admin manual category override on product.category (slug or name match).
 * 3. Default keyword detection rule for built-in categories.
 */
export function productMatchesCategory(
  product: Product,
  categorySlug: CategorySlug,
  customCategories: CustomCategoryData[] = []
): boolean {
  const normSlug = (categorySlug || '').trim().toLowerCase();
  if (normSlug === 'all') return true;

  const manualCategory = (product.category || '').trim().toLowerCase();

  // 1. Check custom categories
  const custom = customCategories.find((c) => c.slug.toLowerCase() === normSlug);
  if (custom) {
    // A) Explicitly assigned by product ID
    if (custom.product_ids && custom.product_ids.includes(product.id)) {
      return true;
    }
    // B) Direct slug or name match on product.category
    if (manualCategory === normSlug || manualCategory === custom.name.trim().toLowerCase()) {
      return true;
    }
    return false;
  }

  // 2. Check built-in category
  const builtIn = CATEGORIES[normSlug as BuiltInCategorySlug];
  if (builtIn) {
    // If a custom entry was saved for this built-in category containing assigned product IDs
    const assignedBuiltIn = customCategories.find((c) => c.slug.toLowerCase() === normSlug);
    if (assignedBuiltIn?.product_ids && assignedBuiltIn.product_ids.length > 0) {
      if (assignedBuiltIn.product_ids.includes(product.id)) {
        return true;
      }
    }

    // Direct slug or name match on product.category
    if (manualCategory === normSlug || manualCategory === builtIn.name.trim().toLowerCase()) {
      return true;
    }

    // Fallback: evaluate the automatic regex detection rule
    return builtIn.matches(product);
  }

  // 3. Direct match fallback
  return manualCategory === normSlug;
}

/**
 * Filters a list of products by gender and category.
 * When gender is 'all', products of any gender are matched.
 * When gender is 'men' or 'women', only matching gender products are returned.
 */
export function filterProductsByGenderAndCategory(
  products: Product[],
  gender: GenderFilter,
  categorySlug: CategorySlug,
  customCategories: CustomCategoryData[] = []
): Product[] {
  return products.filter((p) => {
    // 1. Gender check: if not 'all', filter strictly by gender
    if (gender !== 'all') {
      const prodGender = deriveProductGender(p);
      if (prodGender !== gender) return false;
    }

    // 2. If 'all', include all products for this gender
    if (categorySlug === 'all') return true;

    // 3. Category check: manual override, assignment, or rule match
    return productMatchesCategory(p, categorySlug, customCategories);
  });
}

