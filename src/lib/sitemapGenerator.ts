import { Product } from '../types';

export function generateSitemapXml(products: Product[] = []): string {
  const siteUrl = 'https://www.globalluxuryemporium.com';
  const today = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${siteUrl}/delivery`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/returns`, changefreq: 'monthly', priority: '0.6' },
    { loc: `${siteUrl}/privacy`, changefreq: 'monthly', priority: '0.5' },
  ];

  const visibleProducts = products.filter((p) => p.is_visible !== false);

  const productUrls = visibleProducts.map((p) => {
    const loc = `${siteUrl}/product/${p.id}`;
    const mainImage = p.images?.[0]
      ? p.images[0].startsWith('http')
        ? p.images[0]
        : `${siteUrl}${p.images[0].startsWith('/') ? p.images[0] : `/${p.images[0]}`}`
      : `${siteUrl}/assets/banner.png`;

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${mainImage}</image:loc>
      <image:title>${escapeXml(p.name)}</image:title>
      <image:caption>${escapeXml(p.description?.slice(0, 160) || p.name)}</image:caption>
    </image:image>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- Core Pages -->
${staticUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}

  <!-- Products Collection -->
${productUrls.join('\n')}

</urlset>
`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
