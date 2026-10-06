import { Product } from '../types';

export type Gender = 'men' | 'women';

export type CategorySlug =
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

export interface CategoryDefinition {
  slug: CategorySlug;
  name: string;
  title: string;
  metaTitle: (gender: Gender) => string;
  metaDescription: (gender: Gender) => string;
  headline: (gender: Gender) => string;
  subheadline: string;
  matches: (product: Product) => boolean;
}

export const VALID_CATEGORY_SLUGS: CategorySlug[] = [
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

export function isCategorySlug(slug: string): slug is CategorySlug {
  return VALID_CATEGORY_SLUGS.includes(slug as CategorySlug);
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
    metaTitle: (g) => `All Handcrafted Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Explore our complete collection of handcrafted luxury leather jackets and coats for ${g === 'men' ? 'men' : 'women'}. Free worldwide delivery.`,
    headline: (g) => `All ${g === 'men' ? "Men's" : "Women's"} Jackets`,
    subheadline:
      'Explore our full curated range of genuine leather jackets, coats, and shearling outerwear.',
    matches: () => true,
  },
  biker: {
    slug: 'biker',
    name: 'Biker',
    title: 'Biker Jackets',
    metaTitle: (g) => `Handcrafted Leather Biker Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Explore luxury handcrafted leather biker jackets for ${g === 'men' ? 'men' : 'women'}. Premium calfskin and lambskin with asymmetrical zips and diamond-quilted details. Free worldwide delivery.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Biker Jackets`,
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
    metaTitle: (g) => `Luxury Leather Bomber Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Discover handcrafted luxury leather bomber and flight jackets for ${g === 'men' ? 'men' : 'women'}. Ribbed trims, supple lambskin, and insulated comfort.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Bomber Jackets`,
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
    metaTitle: (g) => `Genuine Shearling Aviator & Flying Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Shop luxury shearling aviator and B3 flying jackets for ${g === 'men' ? 'men' : 'women'}. Heavyweight shearling linings and authentic military styling.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Aviator Jackets`,
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
    metaTitle: (g) => `Luxury Leather Puffer & Down Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Shop luxury leather puffer jackets, quilted leather coats, and goose down outerwear for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Puffer Jackets`,
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
    metaTitle: (g) => `Handcrafted Genuine Shearling & Fur Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Discover handcrafted genuine shearling, sheepskin, and fur-collared leather jackets for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Shearling Jackets`,
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
    metaTitle: (g) => `Café Racer Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Streamlined minimalist café racer leather jackets for ${g === 'men' ? 'men' : 'women'}. Clean mandarin collars and ergonomic fit.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Racer Jackets`,
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
    metaTitle: (g) => `Luxury Leather Varsity & Baseball Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Collegiate leather varsity and baseball jackets for ${g === 'men' ? 'men' : 'women'}. Contrast two-tone leatherwork and artisan finish.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Varsity Jackets`,
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
    title: 'Leather Coats',
    metaTitle: (g) => `Handcrafted Leather Coats & Trenches for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Explore extended leather coats, tailored trenches, and overcoats for ${g === 'men' ? 'men' : 'women'}. Free worldwide delivery.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Leather Coats`,
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
    metaTitle: (g) => `Casual & Everyday Luxury Leather Jackets for ${g === 'men' ? 'Men' : 'Women'} | Global Luxury Emporium`,
    metaDescription: (g) =>
      `Versatile casual leather jackets, blazers, and field jackets for ${g === 'men' ? 'men' : 'women'}.`,
    headline: (g) => `${g === 'men' ? "Men's" : "Women's"} Casual Jackets`,
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

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  if (!slug) return undefined;
  const normalized = slug.trim().toLowerCase();
  return CATEGORIES[normalized as CategorySlug];
}

/**
 * Checks if a product matches a given category slug:
 * 1. Admin manual category override on product.category takes highest priority.
 * 2. Otherwise, evaluates the automatic category detection rule.
 */
export function productMatchesCategory(product: Product, categorySlug: CategorySlug): boolean {
  const manualCategory = (product.category || '').trim().toLowerCase();

  // Admin manual override: if product.category matches a valid category slug exactly
  if (isCategorySlug(manualCategory)) {
    return manualCategory === categorySlug;
  }

  const categoryDef = CATEGORIES[categorySlug];
  if (!categoryDef) return false;

  return categoryDef.matches(product);
}

/**
 * Filters a list of products by gender and category.
 * Men and Women products are kept completely separate.
 */
export function filterProductsByGenderAndCategory(
  products: Product[],
  gender: Gender,
  categorySlug: CategorySlug
): Product[] {
  return products.filter((p) => {
    // 1. Gender check: Men and Women are strictly separate
    const prodGender = deriveProductGender(p);
    if (prodGender !== gender) return false;

    // 2. If 'all', include all products for this gender
    if (categorySlug === 'all') return true;

    // 3. Category check: manual override or rule match
    return productMatchesCategory(p, categorySlug);
  });
}
