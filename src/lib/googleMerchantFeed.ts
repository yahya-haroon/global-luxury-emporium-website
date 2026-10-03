import { Product, Sale } from '../types/index';
import { getProductSaleInfo } from './sales';

export const CANONICAL_SITE_URL = 'https://www.globalluxuryemporium.com';
export const DEFAULT_BRAND = 'Global Luxury Emporium';
export const DEFAULT_CURRENCY = 'GBP';
export const GOOGLE_PRODUCT_CATEGORY = 'Apparel & Accessories > Clothing > Outerwear > Coats & Jackets';
export const GOOGLE_PRODUCT_CATEGORY_ID = '5598';

/**
 * Escapes special characters for safe inclusion inside XML tags.
 * Also removes illegal XML control characters (ASCII 0x00 - 0x1F, except \t, \n, \r).
 */
export function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return String(unsafe)
    // Remove invalid XML control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Cleans product description for Google Merchant Center:
 * - Strips any HTML tags
 * - Collapses excessive whitespace / newlines
 * - Truncates to max allowed length (Google allows up to 5,000 characters)
 */
export function cleanDescription(rawText: string | null | undefined, maxLength = 3000): string {
  if (!rawText) return '';
  const textWithoutHtml = rawText.replace(/<[^>]*>/g, ' ');
  const normalized = textWithoutHtml.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return normalized.slice(0, maxLength - 3) + '...';
}

/**
 * Resolves a primary or secondary image URL to a fully qualified, public HTTPS URL.
 */
export function resolveImageUrl(imageUrl: string | null | undefined, siteUrl: string): string | null {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative path (e.g. /assets/products/...)
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl.replace(/\/+$/, '')}${cleanPath}`;
}

/**
 * Derives Google gender attribute from category or product title.
 */
export function deriveGender(category: string | null | undefined, name: string | null | undefined): 'male' | 'female' | 'unisex' {
  const combined = `${category || ''} ${name || ''}`.toLowerCase();
  const hasMen = /\b(men|man|gentleman|gentlemen|mens|men's)\b/i.test(combined);
  const hasWomen = /\b(women|woman|lady|ladies|womens|women's)\b/i.test(combined);

  if (hasMen && !hasWomen) return 'male';
  if (hasWomen && !hasMen) return 'female';
  return 'unisex';
}

/**
 * Formats a numeric price into Google Merchant Center standard: "XX.XX GBP"
 */
export function formatGooglePrice(price: number, currency = DEFAULT_CURRENCY): string {
  const num = Number(price);
  if (isNaN(num) || num < 0) {
    return `0.00 ${currency}`;
  }
  return `${num.toFixed(2)} ${currency}`;
}

/**
 * Formats start and end dates into Google's ISO 8601 interval format:
 * "YYYY-MM-DDTHH:mm:ssZ/YYYY-MM-DDTHH:mm:ssZ"
 */
export function formatSaleDateInterval(startsAt: string | null | undefined, endsAt: string | null | undefined): string | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;

  return `${start.toISOString()}/${end.toISOString()}`;
}

export interface GoogleProductFeedOptions {
  siteUrl?: string;
  now?: Date;
  includeUnavailable?: boolean;
}

/**
 * Generates a full Google Merchant Center RSS 2.0 XML product feed.
 */
export function generateGoogleProductFeedXml(
  products: Product[] = [],
  sales: Sale[] = [],
  options: GoogleProductFeedOptions = {}
): string {
  const siteUrl = (options.siteUrl || CANONICAL_SITE_URL).replace(/\/+$/, '');
  const now = options.now || new Date();
  const includeUnavailable = options.includeUnavailable ?? true;

  // Filter products: by default include all visible products, or products with clear availability
  const eligibleProducts = products.filter((p) => {
    if (!p || !p.id || !p.name) return false;
    if (!includeUnavailable && p.is_visible === false) return false;
    return true;
  });

  const itemsXml = eligibleProducts
    .map((product) => {
      const isAvailable = product.is_visible !== false;
      const availability = isAvailable ? 'in_stock' : 'out_of_stock';
      const productUrl = `${siteUrl}/product/${encodeURIComponent(product.id)}`;

      // Images
      const rawImages = Array.isArray(product.images) ? product.images : [];
      const primaryImage = resolveImageUrl(rawImages[0] || '/assets/banner.png', siteUrl);
      const additionalImages = rawImages
        .slice(1, 10)
        .map((img) => resolveImageUrl(img, siteUrl))
        .filter((url): url is string => Boolean(url) && url !== primaryImage);

      // Pricing & Sales
      const basePrice = Number(product.price) || 0;
      const priceFormatted = formatGooglePrice(basePrice);
      
      // Check for active or upcoming scheduled sale
      const eligibleSales = sales.filter((s) => {
        if (!s || s.is_active === false) return false;
        const status = (s.starts_at && s.ends_at)
          ? (new Date(s.ends_at).getTime() < now.getTime() ? 'expired' : 'valid')
          : (s.is_active ? 'valid' : 'disabled');
        return status === 'valid';
      });

      const saleInfo = getProductSaleInfo(product, eligibleSales, now);
      // Also check if an upcoming scheduled sale applies if no current active sale
      let candidateSale: Sale | null = null;
      if (saleInfo.hasSale && saleInfo.saleId) {
        candidateSale = sales.find((s) => s.id === saleInfo.saleId) || null;
      } else {
        // Find highest upcoming scheduled sale
        const scheduledSales = sales.filter((s) => {
          if (!s || !s.is_active || !s.starts_at || !s.ends_at) return false;
          const start = new Date(s.starts_at).getTime();
          const end = new Date(s.ends_at).getTime();
          return start > now.getTime() && end > start;
        });
        const upcomingForProd = scheduledSales.filter((s) => {
          if (s.scope === 'all') return true;
          if (s.scope === 'category') {
            const sCat = (s.category || '').trim().toLowerCase();
            const pCat = (product.category || '').trim().toLowerCase();
            return sCat === pCat || (sCat === 'men' && pCat.includes('men')) || (sCat === 'women' && pCat.includes('women'));
          }
          if (s.scope === 'products') {
            return Array.isArray(s.product_ids) && s.product_ids.some((id) => String(id) === String(product.id));
          }
          return false;
        }).sort((a, b) => Number(b.discount_percentage) - Number(a.discount_percentage));

        if (upcomingForProd.length > 0) {
          candidateSale = upcomingForProd[0];
        }
      }

      let salePriceTag = '';
      let saleDateTag = '';
      if (candidateSale && Number(candidateSale.discount_percentage) > 0) {
        const discount = Number(candidateSale.discount_percentage);
        const calculated = Math.round(basePrice * (1 - discount / 100) * 100) / 100;
        if (calculated > 0 && calculated < basePrice) {
          salePriceTag = `\n      <g:sale_price>${formatGooglePrice(calculated)}</g:sale_price>`;
          if (candidateSale.starts_at && candidateSale.ends_at) {
            const dateRange = formatSaleDateInterval(candidateSale.starts_at, candidateSale.ends_at);
            if (dateRange) {
              saleDateTag = `\n      <g:sale_price_effective_date>${escapeXml(dateRange)}</g:sale_price_effective_date>`;
            }
          }
        }
      }

      // Metadata & Taxonomies
      const cleanedTitle = escapeXml(product.name.trim().slice(0, 150));
      const descriptionText = product.description || `${product.name} handcrafted by Global Luxury Emporium.`;
      const cleanedDesc = escapeXml(cleanDescription(descriptionText));
      const gender = deriveGender(product.category, product.name);
      const productTypeCategory = product.category ? escapeXml(`Clothing > Outerwear > ${product.category}`) : 'Clothing > Outerwear > Leather Jackets';

      // Additional images XML
      const additionalImagesXml = additionalImages
        .map((imgUrl) => `\n      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`)
        .join('');

      // Size attribute
      let sizeXml = '';
      if (product.sizes && typeof product.sizes === 'string') {
        const cleanedSizes = escapeXml(product.sizes.trim().slice(0, 100));
        if (cleanedSizes) {
          sizeXml = `\n      <g:size>${cleanedSizes}</g:size>`;
        }
      }

      return `    <item>
      <g:id>${escapeXml(product.id)}</g:id>
      <g:title>${cleanedTitle}</g:title>
      <g:description>${cleanedDesc}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(primaryImage || `${siteUrl}/assets/banner.png`)}</g:image_link>${additionalImagesXml}
      <g:availability>${availability}</g:availability>
      <g:price>${priceFormatted}</g:price>${salePriceTag}${saleDateTag}
      <g:brand>${DEFAULT_BRAND}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>${GOOGLE_PRODUCT_CATEGORY}</g:google_product_category>
      <g:product_type>${productTypeCategory}</g:product_type>
      <g:material>Genuine Leather</g:material>
      <g:gender>${gender}</g:gender>
      <g:age_group>adult</g:age_group>${sizeXml}
      <g:shipping>
        <g:country>GB</g:country>
        <g:service>Standard UK Delivery</g:service>
        <g:price>0.00 GBP</g:price>
      </g:shipping>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${DEFAULT_BRAND}</title>
    <link>${siteUrl}</link>
    <description>Handcrafted Genuine Leather Jackets and Bespoke Outerwear</description>
${itemsXml}
  </channel>
</rss>
`;
}
