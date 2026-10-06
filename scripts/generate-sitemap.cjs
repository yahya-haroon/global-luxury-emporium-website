const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://zwmpibunoyyqvagebotn.supabase.co/rest/v1/products?select=id,name,category,description,images,is_visible,created_at,updated_at&order=created_at.desc&limit=1000';
const options = {
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bXBpYnVub3l5cXZhZ2Vib3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzYzNzgsImV4cCI6MjEwNTU1MjM3OH0.Je7lwQ7RyIwHy1y40vUMoR3mPZQ43a9qo2lACQuH0mY',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bXBpYnVub3l5cXZhZ2Vib3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzYzNzgsImV4cCI6MjEwNTU1MjM3OH0.Je7lwQ7RyIwHy1y40vUMoR3mPZQ43a9qo2lACQuH0mY'
  }
};

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

https.get(url, options, (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    try {
      const products = JSON.parse(raw);
      const siteUrl = 'https://www.globalluxuryemporium.com';
      const today = new Date().toISOString().split('T')[0];

      const categories = [
        'all', 'biker', 'bomber', 'aviator', 'puffer', 'shearling', 'racer', 'varsity', 'casual', 'coats'
      ];

      const staticUrls = [
        { loc: `${siteUrl}/`, changefreq: 'daily', priority: '1.0' },
        ...categories.map((c) => ({
          loc: `${siteUrl}/men/${c}`,
          changefreq: 'weekly',
          priority: '0.8',
        })),
        ...categories.map((c) => ({
          loc: `${siteUrl}/women/${c}`,
          changefreq: 'weekly',
          priority: '0.8',
        })),
        { loc: `${siteUrl}/delivery`, changefreq: 'monthly', priority: '0.6' },
        { loc: `${siteUrl}/returns`, changefreq: 'monthly', priority: '0.6' },
        { loc: `${siteUrl}/privacy`, changefreq: 'monthly', priority: '0.5' },
      ];

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
      xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n';
      xml += '  <!-- Core Brand Pages -->\n';

      for (const u of staticUrls) {
        xml += '  <url>\n';
        xml += `    <loc>${u.loc}</loc>\n`;
        xml += `    <lastmod>${today}</lastmod>\n`;
        xml += `    <changefreq>${u.changefreq}</changefreq>\n`;
        xml += `    <priority>${u.priority}</priority>\n`;
        xml += '  </url>\n';
      }

      xml += `\n  <!-- All ${products.length} Handcrafted Leather Products -->\n`;

      for (const p of products) {
        if (p.is_visible === false) continue;
        const loc = `${siteUrl}/product/${p.id}`;
        const lastmod = p.updated_at ? p.updated_at.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : today);
        
        const img = p.images && p.images[0] ? p.images[0] : `${siteUrl}/assets/banner.png`;
        const fullImg = img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? img : `/${img}`}`;

        xml += '  <url>\n';
        xml += `    <loc>${loc}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '    <image:image>\n';
        xml += `      <image:loc>${escapeXml(fullImg)}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(p.name)}</image:title>\n`;
        xml += `      <image:caption>${escapeXml((p.description || p.name).slice(0, 160))}</image:caption>\n`;
        xml += '    </image:image>\n';
        xml += '  </url>\n';
      }

      xml += '</urlset>\n';

      const targetPath = path.resolve(__dirname, '..', 'public', 'sitemap.xml');
      fs.writeFileSync(targetPath, xml, 'utf8');
      console.log(`Successfully generated ${targetPath} with ${products.length} products!`);
    } catch (err) {
      console.error('Error generating sitemap:', err);
    }
  });
}).on('error', err => console.error('Request error:', err));
