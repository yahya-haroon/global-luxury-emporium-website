import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DEFAULT_FEATURED_IMAGES } from '../lib/homepageImages';
import { Product } from '../types';

export const FeaturedHighlights: React.FC = () => {
  const { products, settings, homepageSlots, homepageImages } = useData();

  // Admin-configured featured cards (product selection + optional image
  // override); falls back to the first products when nothing is configured.
  const configured = homepageImages
    .filter((r) => r.is_active && r.slot_key.startsWith('featured_') && r.product_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const configuredProducts = configured
    .map((row) => ({ row, product: products.find((p) => p.id === row.product_id) }))
    .filter((entry): entry is { row: (typeof configured)[number]; product: Product } => Boolean(entry.product));

  const featured =
    configuredProducts.length > 0
      ? configuredProducts.map((entry) => ({
          product: entry.product,
          image:
            entry.row.image_url ||
            DEFAULT_FEATURED_IMAGES[entry.product.id] ||
            entry.product.images[1] ||
            entry.product.images[0],
        }))
      : products.slice(0, 4).map((product) => ({
          product,
          image:
            homepageSlots[`featured_${products.indexOf(product) + 1}`]?.image_url ||
            DEFAULT_FEATURED_IMAGES[product.id] ||
            product.images[1] ||
            product.images[0],
        }));

  if (featured.length === 0) return null;

  return (
    <section className="hl">
      <div className="hl-head">
        <div className="sm" style={{ color: 'var(--au2)' }}>
          Featured product highlights
        </div>
        <h2 className="hl-title">This Season&rsquo;s Standouts</h2>
      </div>

      <div className="hl-grid">
        {featured.map(({ product, image }) => (
          <Link key={product.id} className="hl-card" to={`/product/${product.id}`}>
            <div className="hl-img">
              <img src={image} alt={product.name} loading="lazy" />
            </div>
            <div className="hl-body">
              <span className="sm hl-cat">{product.category}</span>
              <h3>{product.name}</h3>
              <span className="hl-price">
                {settings.currency}
                {product.price}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
