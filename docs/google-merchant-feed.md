# Google Merchant Center Product Feed

**Production Documentation for Global Luxury Emporium Ltd**

---

## 1. Feed Overview

Global Luxury Emporium uses a production-ready, automated Google Merchant Center XML RSS 2.0 product feed. The feed automatically indexes all handcrafted leather jackets, coats, and bespoke apparel directly from Supabase, applying live pricing, active/scheduled discounts, accurate availability, absolute image links, and Google Apparel taxonomies.

### Feed Endpoints

| URL | Type | Description |
|---|---|---|
| `https://www.globalluxuryemporium.com/google-product-feed.xml` | Public XML File & Cloudflare Function | Primary feed URL for Google Merchant Center automatic daily fetching. |
| `https://www.globalluxuryemporium.com/api/google-product-feed` | Cloudflare Pages Function | Serverless JSON/XML endpoint fetching real-time Supabase product data. |

> **Format:** Standard RSS 2.0 with Google Base namespace:
> `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`
> **MIME Content-Type:** `application/xml; charset=utf-8`
> **Cache Policy:** `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`

---

## 2. Included Product Attributes

Every `<item>` in the feed contains the required and recommended Google Merchant Center tags:

| Attribute | Example Value | Source / Business Logic |
|---|---|---|
| `<g:id>` | `6ebdf95f-6d2c-4f06-ae70-69796d1e4b78` | Stable, unique Supabase UUID. Preserved across title or category edits. |
| `<g:title>` | `Black Shearling Aviator Jacket` | Clean product name, XML-safe, max 150 chars. |
| `<g:description>` | `Product Specification: Real Leather...` | HTML stripped, whitespace normalized, XML-escaped. |
| `<g:link>` | `https://www.globalluxuryemporium.com/product/6ebdf95f-6d2c-4f06-ae70-69796d1e4b78` | Canonical HTTPS URL matching React Router route. |
| `<g:image_link>` | `https://zwmpibunoyyqvagebotn.supabase.co/storage/v1/object/public/product-images/...` | Absolute primary product image stored in Supabase CDN. |
| `<g:additional_image_link>` | Up to 10 additional image URLs | High-resolution gallery and detail images. |
| `<g:availability>` | `in_stock` / `out_of_stock` | Computed from `product.is_visible`. Visible products show `in_stock`. |
| `<g:price>` | `120.00 GBP` | Base retail price formatted with 2 decimal places and ISO currency code. |
| `<g:sale_price>` | `84.00 GBP` | Calculated discount during active or scheduled promotions. |
| `<g:sale_price_effective_date>` | `2026-10-03T23:00:00.000Z/2026-10-04T23:00:00.000Z` | ISO 8601 start/end date range. Allows Google to pre-index scheduled sales. |
| `<g:brand>` | `Global Luxury Emporium` | Brand manufacturer tag. |
| `<g:condition>` | `new` | All items are newly handcrafted. |
| `<g:identifier_exists>` | `no` | Bespoke apparel without GTIN/EAN/MPN barcodes. |
| `<g:google_product_category>` | `Apparel & Accessories > Clothing > Outerwear > Coats & Jackets` | Google taxonomy ID `5598`. |
| `<g:product_type>` | `Clothing > Outerwear > Women` | Internal store category hierarchy. |
| `<g:material>` | `Genuine Leather` | Primary material specification. |
| `<g:gender>` | `female` / `male` / `unisex` | Derived intelligently from category and title keywords. |
| `<g:age_group>` | `adult` | Default target demographic. |
| `<g:size>` | `XS, S, M, L, XL, XXL, XXXL, 4XL` | Cleaned size string from product database. |
| `<g:shipping>` | `GB` / `0.00 GBP` | Free standard UK delivery. |

---

## 3. How to Connect in Google Merchant Center

1. Log in to [Google Merchant Center](https://merchants.google.com/).
2. Navigate to **Products** > **Feeds** (or **Data sources**).
3. Click **Add products** / **Add feed**.
4. Configure target country and language:
   - **Target country:** United Kingdom (or international targets)
   - **Language:** English
5. Select **Scheduled fetch**.
6. Enter feed details:
   - **File name:** `google-product-feed.xml`
   - **Fetch frequency:** Daily
   - **Fetch time:** Preferred time (e.g. 02:00 AM UTC)
   - **File URL:** `https://www.globalluxuryemporium.com/google-product-feed.xml` (or `https://www.globalluxuryemporium.com/api/google-product-feed`)
7. Click **Create feed** and trigger an initial fetch.

---

## 4. Automation & Deployment

### Build-time Generation
The build script automatically runs both sitemap and Google feed generators:
```bash
npm run build
```
This executes:
1. `node scripts/generate-sitemap.cjs` -> writes `public/sitemap.xml`
2. `node scripts/generate-google-feed.cjs` -> writes `public/google-product-feed.xml`
3. `tsc` -> compiles TypeScript
4. `vite build` -> bundles assets into `dist/` including `dist/google-product-feed.xml`

### Standalone Commands
```bash
# Generate the feed locally
npm run feed

# Audit and validate against Google Merchant Center specification
npm run validate:feed
```

### Cloudflare Edge Functions
Files in `functions/`:
- `functions/api/google-product-feed.ts`
- `functions/google-product-feed.xml.ts`

These Cloudflare Pages Functions execute on edge servers to fetch live Supabase product and sales data upon request, ensuring real-time consistency even between static rebuilds.
