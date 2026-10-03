const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://zwmpibunoyyqvagebotn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bXBpYnVub3l5cXZhZ2Vib3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzYzNzgsImV4cCI6MjEwNTU1MjM3OH0.Je7lwQ7RyIwHy1y40vUMoR3mPZQ43a9qo2lACQuH0mY';
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://www.globalluxuryemporium.com').replace(/\/+$/, '');

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Accept': 'application/json',
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}: ${raw}`));
        }
      });
    }).on('error', reject);
  });
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cleanDescription(rawText, maxLength = 3000) {
  if (!rawText) return '';
  const textWithoutHtml = rawText.replace(/<[^>]*>/g, ' ');
  const normalized = textWithoutHtml.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength - 3) + '...';
}

function resolveImageUrl(imageUrl, siteUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  const trimmed = imageUrl.trim();
  if (!trimmed || trimmed.startsWith('data:')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${cleanPath}`;
}

function deriveGender(category, name) {
  const combined = `${category || ''} ${name || ''}`.toLowerCase();
  const hasMen = /\b(men|man|gentleman|gentlemen|mens|men's)\b/i.test(combined);
  const hasWomen = /\b(women|woman|lady|ladies|womens|women's)\b/i.test(combined);
  if (hasMen && !hasWomen) return 'male';
  if (hasWomen && !hasMen) return 'female';
  return 'unisex';
}

function getSaleStatus(sale, now = new Date()) {
  if (!sale || sale.is_active === false) return 'disabled';
  const startTime = new Date(sale.starts_at).getTime();
  const endTime = new Date(sale.ends_at).getTime();
  const currentTime = now.getTime();
  if (isNaN(startTime) || isNaN(endTime)) return 'disabled';
  if (currentTime < startTime) return 'scheduled';
  if (currentTime > endTime) return 'expired';
  return 'active';
}

function saleAppliesToProduct(sale, product) {
  if (!sale || !product || !product.id) return false;
  if (sale.scope === 'all') return true;
  if (sale.scope === 'category') {
    if (!sale.category || !product.category) return false;
    const sCat = sale.category.trim().toLowerCase();
    const pCat = product.category.trim().toLowerCase();
    if (sCat === pCat) return true;
    if (sCat === 'men' && pCat.includes('men') && !pCat.includes('women')) return true;
    if (sCat === 'women' && (pCat.includes('women') || pCat.includes('ladies'))) return true;
    return false;
  }
  if (sale.scope === 'products') {
    if (!Array.isArray(sale.product_ids)) return false;
    return sale.product_ids.some(id => String(id).trim() === String(product.id).trim());
  }
  return false;
}

function getCandidateSaleForProduct(sales, product, now = new Date()) {
  if (!Array.isArray(sales) || sales.length === 0 || !product) return null;
  // 1. Check for currently active sales
  const activeSales = sales.filter(s => getSaleStatus(s, now) === 'active');
  const eligibleActive = activeSales.filter(s => saleAppliesToProduct(s, product));
  if (eligibleActive.length > 0) {
    const scopePriority = { products: 3, category: 2, all: 1 };
    eligibleActive.sort((a, b) => {
      const diff = Number(b.discount_percentage) - Number(a.discount_percentage);
      if (Math.abs(diff) > 0.001) return diff;
      const pA = scopePriority[a.scope] || 0;
      const pB = scopePriority[b.scope] || 0;
      if (pB !== pA) return pB - pA;
      return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
    });
    return eligibleActive[0];
  }

  // 2. Check for upcoming scheduled sales that have both start and end date
  const scheduledSales = sales.filter(s => {
    if (!s || s.is_active === false || !s.starts_at || !s.ends_at) return false;
    const start = new Date(s.starts_at).getTime();
    const end = new Date(s.ends_at).getTime();
    return start > now.getTime() && end > start;
  });
  const eligibleScheduled = scheduledSales.filter(s => saleAppliesToProduct(s, product));
  if (eligibleScheduled.length > 0) {
    eligibleScheduled.sort((a, b) => Number(b.discount_percentage) - Number(a.discount_percentage));
    return eligibleScheduled[0];
  }

  return null;
}

async function run() {
  try {
    console.log('Fetching products and sales for Google Merchant Product Feed...');
    const productsUrl = `${SUPABASE_URL}/rest/v1/products?order=sort_order.asc,created_at.desc&limit=1000`;
    const salesUrl = `${SUPABASE_URL}/rest/v1/sales?is_active=eq.true&order=created_at.desc`;

    const [products, sales] = await Promise.all([
      fetchJson(productsUrl),
      fetchJson(salesUrl).catch(err => {
        console.warn('Notice: sales table query returned error (might be empty/disabled):', err.message);
        return [];
      }),
    ]);

    const now = new Date();
    const siteUrl = SITE_URL;

    console.log(`Loaded ${products.length} products and ${sales.length} active sales.`);

    let itemsXml = '';
    let saleItemCount = 0;

    for (const p of products) {
      if (!p || !p.id || !p.name) continue;
      const isAvailable = p.is_visible !== false;
      const availability = isAvailable ? 'in_stock' : 'out_of_stock';
      const productUrl = `${siteUrl}/product/${encodeURIComponent(p.id)}`;

      const rawImages = Array.isArray(p.images) ? p.images : [];
      const primaryImage = resolveImageUrl(rawImages[0] || '/assets/banner.png', siteUrl);
      const additionalImages = rawImages
        .slice(1, 10)
        .map(img => resolveImageUrl(img, siteUrl))
        .filter(url => Boolean(url) && url !== primaryImage);

      const basePrice = Number(p.price) || 0;
      const priceFormatted = `${basePrice.toFixed(2)} GBP`;

      // Active or scheduled sale check
      const activeSale = getCandidateSaleForProduct(sales, p, now);
      let salePriceTag = '';
      let saleDateTag = '';

      if (activeSale && Number(activeSale.discount_percentage) > 0) {
        const discount = Number(activeSale.discount_percentage);
        const salePrice = Math.round(basePrice * (1 - discount / 100) * 100) / 100;
        if (salePrice > 0 && salePrice < basePrice) {
          saleItemCount++;
          salePriceTag = `\n      <g:sale_price>${salePrice.toFixed(2)} GBP</g:sale_price>`;
          if (activeSale.starts_at && activeSale.ends_at) {
            const start = new Date(activeSale.starts_at);
            const end = new Date(activeSale.ends_at);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              saleDateTag = `\n      <g:sale_price_effective_date>${escapeXml(`${start.toISOString()}/${end.toISOString()}`)}</g:sale_price_effective_date>`;
            }
          }
        }
      }

      const cleanedTitle = escapeXml(p.name.trim().slice(0, 150));
      const descriptionText = p.description || `${p.name} handcrafted by Global Luxury Emporium.`;
      const cleanedDesc = escapeXml(cleanDescription(descriptionText));
      const gender = deriveGender(p.category, p.name);
      const productTypeCategory = p.category ? escapeXml(`Clothing > Outerwear > ${p.category}`) : 'Clothing > Outerwear > Leather Jackets';

      const additionalImagesXml = additionalImages
        .map(imgUrl => `\n      <g:additional_image_link>${escapeXml(imgUrl)}</g:additional_image_link>`)
        .join('');

      let sizeXml = '';
      if (p.sizes && typeof p.sizes === 'string') {
        const cleanedSizes = escapeXml(p.sizes.trim().slice(0, 100));
        if (cleanedSizes) {
          sizeXml = `\n      <g:size>${cleanedSizes}</g:size>`;
        }
      }

      itemsXml += `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${cleanedTitle}</g:title>
      <g:description>${cleanedDesc}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(primaryImage || `${siteUrl}/assets/banner.png`)}</g:image_link>${additionalImagesXml}
      <g:availability>${availability}</g:availability>
      <g:price>${priceFormatted}</g:price>${salePriceTag}${saleDateTag}
      <g:brand>Global Luxury Emporium</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>
      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Outerwear &gt; Coats &amp; Jackets</g:google_product_category>
      <g:product_type>${productTypeCategory}</g:product_type>
      <g:material>Genuine Leather</g:material>
      <g:gender>${gender}</g:gender>
      <g:age_group>adult</g:age_group>${sizeXml}
      <g:shipping>
        <g:country>GB</g:country>
        <g:service>Standard UK Delivery</g:service>
        <g:price>0.00 GBP</g:price>
      </g:shipping>
    </item>\n`;
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Global Luxury Emporium</title>
    <link>${siteUrl}</link>
    <description>Handcrafted Genuine Leather Jackets and Bespoke Outerwear</description>
${itemsXml}  </channel>
</rss>
`;

    const publicPath = path.resolve(__dirname, '..', 'public', 'google-product-feed.xml');
    fs.writeFileSync(publicPath, xml, 'utf8');
    console.log(`[Google Feed Generator] Successfully generated ${publicPath} with ${products.length} products (${saleItemCount} active sale items)!`);

    // If dist/ directory already exists, also copy to dist/ for immediate availability
    const distDir = path.resolve(__dirname, '..', 'dist');
    if (fs.existsSync(distDir)) {
      const distPath = path.join(distDir, 'google-product-feed.xml');
      fs.writeFileSync(distPath, xml, 'utf8');
      console.log(`[Google Feed Generator] Mirrored to ${distPath}`);
    }
  } catch (err) {
    console.error('Fatal error generating Google Product Feed:', err);
    process.exit(1);
  }
}

run();
