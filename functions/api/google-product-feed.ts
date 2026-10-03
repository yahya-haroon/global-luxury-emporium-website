import { generateGoogleProductFeedXml, CANONICAL_SITE_URL } from '../../src/lib/googleMerchantFeed';
import { Product, Sale } from '../../src/types/index';

interface Env {
  VITE_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  PUBLIC_SITE_URL?: string;
}

const DEFAULT_SUPABASE_URL = 'https://zwmpibunoyyqvagebotn.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3bXBpYnVub3l5cXZhZ2Vib3RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NzYzNzgsImV4cCI6MjEwNTU1MjM3OH0.Je7lwQ7RyIwHy1y40vUMoR3mPZQ43a9qo2lACQuH0mY';

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const env = context.env || {};
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  const siteUrl = env.PUBLIC_SITE_URL || CANONICAL_SITE_URL;

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Accept': 'application/json',
  };

  try {
    // 1. Fetch public products and active sales concurrently
    const [productsRes, salesRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/products?order=sort_order.asc,created_at.desc&limit=1000`, { headers }),
      fetch(`${supabaseUrl}/rest/v1/sales?is_active=eq.true&order=created_at.desc`, { headers }).catch(() => null),
    ]);

    if (!productsRes.ok) {
      throw new Error(`Supabase products fetch failed: ${productsRes.status} ${productsRes.statusText}`);
    }

    const rawProducts = await productsRes.json();
    let sales: Sale[] = [];
    if (salesRes && salesRes.ok) {
      try {
        sales = await salesRes.json();
      } catch (err) {
        console.warn('Failed to parse sales in feed function:', err);
      }
    }

    // Map database fields to Product interface
    const products: Product[] = (Array.isArray(rawProducts) ? rawProducts : []).map((p: any) => ({
      id: String(p.id),
      name: String(p.name || ''),
      price: Number(p.price) || 0,
      category: p.category || 'Women',
      description: p.description || '',
      sizes: p.sizes || 'XS, S, M, L, XL',
      options: Array.isArray(p.options) ? p.options : [],
      images: Array.isArray(p.images) && p.images.length > 0 ? p.images : ['/assets/banner.png'],
      allow_personalisation: Boolean(p.allow_personalisation),
      allow_requirements: Boolean(p.allow_requirements),
      is_visible: p.is_visible !== false,
      sort_order: Number(p.sort_order || 0),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const xml = generateGoogleProductFeedXml(products, sales, {
      siteUrl,
      now: new Date(),
      includeUnavailable: true,
    });

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error: any) {
    console.error('Google Product Feed Generation Error:', error);
    const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Global Luxury Emporium</title>
    <link>${siteUrl}</link>
    <description>Product feed temporarily unavailable. Error: ${escapeXmlString(error?.message || 'Unknown error')}</description>
  </channel>
</rss>`;

    return new Response(errorXml, {
      status: 500,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

function escapeXmlString(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const onRequest = onRequestGet;
