const fs = require('fs');
const path = require('path');

function validateGoogleFeed(filePath) {
  console.log(`\n======================================================`);
  console.log(`🔍 VALIDATING GOOGLE MERCHANT FEED: ${filePath}`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Feed file does not exist at ${filePath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(filePath, 'utf8');

  let errors = [];
  let warnings = [];

  // 1. Basic XML structure
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('Missing XML declaration at the start.');
  }

  if (!xml.includes('<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">')) {
    errors.push('Missing or invalid RSS 2.0 root tag with Google namespace xmlns:g.');
  }

  if (!xml.includes('<channel>') || !xml.includes('</channel>') || !xml.includes('</rss>')) {
    errors.push('Missing closing channel or rss tags.');
  }

  // 2. Channel metadata
  if (!xml.includes('<title>Global Luxury Emporium</title>')) {
    warnings.push('Channel title is missing or modified.');
  }
  if (!xml.includes('<link>https://www.globalluxuryemporium.com</link>')) {
    warnings.push('Channel link does not point to canonical production domain.');
  }

  // 3. Extract items
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  console.log(`📦 Found ${itemMatches.length} product items in the feed.`);

  if (itemMatches.length === 0) {
    errors.push('Feed contains zero <item> elements.');
  }

  const seenIds = new Set();
  let saleItems = 0;
  let inStockItems = 0;
  let outOfStockItems = 0;
  const priceRegex = /^\d+(\.\d{2})?\s+[A-Z]{3}$/;
  const dateIntervalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  for (let i = 0; i < itemMatches.length; i++) {
    const item = itemMatches[i];
    const indexLabel = `Item #${i + 1}`;

    const extractTag = (tag) => {
      const match = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return match ? match[1].trim() : null;
    };

    const id = extractTag('g:id');
    const title = extractTag('g:title');
    const description = extractTag('g:description');
    const link = extractTag('g:link');
    const imageLink = extractTag('g:image_link');
    const availability = extractTag('g:availability');
    const price = extractTag('g:price');
    const salePrice = extractTag('g:sale_price');
    const saleEffectiveDate = extractTag('g:sale_price_effective_date');
    const brand = extractTag('g:brand');
    const condition = extractTag('g:condition');
    const identifierExists = extractTag('g:identifier_exists');
    const googleCategory = extractTag('g:google_product_category');

    // ID validation
    if (!id) {
      errors.push(`${indexLabel}: Missing <g:id>`);
    } else if (seenIds.has(id)) {
      errors.push(`${indexLabel}: Duplicate <g:id> "${id}" found`);
    } else {
      seenIds.add(id);
    }

    // Title validation
    if (!title) {
      errors.push(`${indexLabel} (${id}): Missing <g:title>`);
    } else if (title.length > 150) {
      errors.push(`${indexLabel} (${id}): Title exceeds 150 characters (${title.length})`);
    }

    // Description validation
    if (!description) {
      warnings.push(`${indexLabel} (${id}): Description is empty`);
    } else if (description.length > 5000) {
      errors.push(`${indexLabel} (${id}): Description exceeds 5000 characters`);
    } else if (/<[^>]+>/.test(description)) {
      errors.push(`${indexLabel} (${id}): Description contains unescaped HTML tags`);
    }

    // Link validation
    if (!link) {
      errors.push(`${indexLabel} (${id}): Missing <g:link>`);
    } else if (!link.startsWith('https://www.globalluxuryemporium.com/product/')) {
      errors.push(`${indexLabel} (${id}): Link must be absolute HTTPS canonical product URL, got: "${link}"`);
    }

    // Image link validation
    if (!imageLink) {
      errors.push(`${indexLabel} (${id}): Missing <g:image_link>`);
    } else if (!imageLink.startsWith('https://')) {
      errors.push(`${indexLabel} (${id}): Image link must be absolute HTTPS URL, got: "${imageLink}"`);
    }

    // Availability validation
    if (availability === 'in_stock') {
      inStockItems++;
    } else if (availability === 'out_of_stock') {
      outOfStockItems++;
    } else {
      errors.push(`${indexLabel} (${id}): Availability must be "in_stock" or "out_of_stock", got "${availability}"`);
    }

    // Price validation
    if (!price) {
      errors.push(`${indexLabel} (${id}): Missing <g:price>`);
    } else if (!priceRegex.test(price)) {
      errors.push(`${indexLabel} (${id}): Price format invalid, expected "XX.XX GBP", got "${price}"`);
    }

    // Sale Price validation
    if (salePrice) {
      saleItems++;
      if (!priceRegex.test(salePrice)) {
        errors.push(`${indexLabel} (${id}): Sale price format invalid, expected "XX.XX GBP", got "${salePrice}"`);
      }
      const numBase = parseFloat(price);
      const numSale = parseFloat(salePrice);
      if (numSale >= numBase) {
        errors.push(`${indexLabel} (${id}): Sale price (${numSale}) must be less than regular price (${numBase})`);
      }
      if (saleEffectiveDate && !dateIntervalRegex.test(saleEffectiveDate)) {
        errors.push(`${indexLabel} (${id}): Sale date interval format invalid: "${saleEffectiveDate}"`);
      }
    }

    // Brand & Condition validation
    if (brand !== 'Global Luxury Emporium') {
      warnings.push(`${indexLabel} (${id}): Expected brand "Global Luxury Emporium", got "${brand}"`);
    }
    if (condition !== 'new') {
      errors.push(`${indexLabel} (${id}): Condition must be "new", got "${condition}"`);
    }
    if (identifierExists !== 'no') {
      errors.push(`${indexLabel} (${id}): identifier_exists should be "no" for custom bespoke apparel, got "${identifierExists}"`);
    }
    if (!googleCategory) {
      warnings.push(`${indexLabel} (${id}): Missing <g:google_product_category>`);
    }
  }

  console.log(`\n📊 AUDIT SUMMARY:`);
  console.log(`   - Total items: ${itemMatches.length}`);
  console.log(`   - Unique product IDs: ${seenIds.size}`);
  console.log(`   - In stock: ${inStockItems}`);
  console.log(`   - Out of stock: ${outOfStockItems}`);
  console.log(`   - Items with active/scheduled sale prices: ${saleItems}`);

  if (warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS (${warnings.length}):`);
    warnings.slice(0, 5).forEach(w => console.log(`   - ${w}`));
    if (warnings.length > 5) console.log(`   ... and ${warnings.length - 5} more warnings`);
  }

  if (errors.length > 0) {
    console.error(`\n❌ VALIDATION FAILED with ${errors.length} errors:`);
    errors.slice(0, 10).forEach(e => console.error(`   - ${e}`));
    if (errors.length > 10) console.error(`   ... and ${errors.length - 10} more errors`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL CHECKS PASSED: Google Merchant Center feed is 100% valid, compliant, and production ready!`);
  }
}

const targetFeed = process.argv[2] || path.resolve(__dirname, '..', 'public', 'google-product-feed.xml');
validateGoogleFeed(targetFeed);
