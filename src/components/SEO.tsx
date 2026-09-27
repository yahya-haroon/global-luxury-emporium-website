import React, { useEffect } from 'react';

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  image?: string;
  ogType?: 'website' | 'product' | 'article';
  noIndex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
  breadcrumbs?: BreadcrumbItem[];
}

const SITE_URL = 'https://www.globalluxuryemporium.com';
const DEFAULT_TITLE = 'Global Luxury Emporium | Handcrafted Leather Jackets & Coats';
const DEFAULT_DESC =
  'Shop handcrafted luxury leather jackets and coats for men and women at Global Luxury Emporium. Designed in London, artisan tailored, and shipped worldwide with free tracked delivery.';
const DEFAULT_IMAGE = `${SITE_URL}/assets/banner.png`;

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESC,
  keywords = 'luxury leather jackets, handcrafted leather coats, aviator shearling jacket, biker jacket, racer jacket, bespoke leather fashion, London leather',
  canonical,
  image = DEFAULT_IMAGE,
  ogType = 'website',
  noIndex = false,
  structuredData,
  breadcrumbs,
}) => {
  useEffect(() => {
    // 1. Page Title
    const fullTitle = title
      ? title.includes('Global Luxury Emporium')
        ? title
        : `${title} | Global Luxury Emporium`
      : DEFAULT_TITLE;
    document.title = fullTitle;

    // Helper: set or create a <meta> element
    const setMeta = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper: set or create a <link> element
    const setLink = (rel: string, href: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
      }
      el.setAttribute('href', href);
    };

    // 2. Standard Meta Tags
    setMeta('name', 'description', description);
    setMeta('name', 'keywords', keywords);
    setMeta(
      'name',
      'robots',
      noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    );

    // 3. Canonical URL
    const canonicalUrl = canonical
      ? canonical.startsWith('http')
        ? canonical
        : `${SITE_URL}${canonical.startsWith('/') ? canonical : `/${canonical}`}`
      : window.location.href.split('?')[0];
    setLink('canonical', canonicalUrl);

    // 4. Open Graph Tags
    const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    setMeta('property', 'og:site_name', 'Global Luxury Emporium');
    setMeta('property', 'og:locale', 'en_GB');
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('property', 'og:image', fullImageUrl);

    // 5. Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', fullImageUrl);
    setMeta('name', 'twitter:url', canonicalUrl);

    // 6. JSON-LD Structured Data
    const scriptId = 'dynamic-seo-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }

    const jsonLdPayloads: Array<Record<string, unknown>> = [];

    // Optional breadcrumb list schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      jsonLdPayloads.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((b, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: b.name,
          item: b.item.startsWith('http') ? b.item : `${SITE_URL}${b.item.startsWith('/') ? b.item : `/${b.item}`}`,
        })),
      });
    }

    // Custom structured data (e.g. Product, CollectionPage, etc.)
    if (structuredData) {
      if (Array.isArray(structuredData)) {
        jsonLdPayloads.push(...structuredData);
      } else {
        jsonLdPayloads.push(structuredData);
      }
    }

    if (jsonLdPayloads.length > 0) {
      scriptEl.textContent = JSON.stringify(
        jsonLdPayloads.length === 1 ? jsonLdPayloads[0] : jsonLdPayloads
      );
    } else {
      scriptEl.textContent = '';
    }

    // Cleanup when unmounting
    return () => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.remove();
      }
    };
  }, [title, description, keywords, canonical, image, ogType, noIndex, structuredData, breadcrumbs]);

  return null;
};
