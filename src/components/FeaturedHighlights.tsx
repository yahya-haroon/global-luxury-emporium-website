import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DEFAULT_FEATURED_IMAGES } from '../lib/homepageImages';
import { Product } from '../types';
import { ProductCardRating } from './ProductCardRating';

export const FeaturedHighlights: React.FC = () => {
  const { products, settings, homepageSlots, homepageImages, reviews } = useData();

  // Precompute average rating & published review count per product
  const reviewStatsByProduct = React.useMemo(() => {
    const stats: Record<string, { count: number; average: number }> = {};
    if (!reviews || !Array.isArray(reviews)) return stats;

    for (const r of reviews) {
      if (!r.product_id || !r.published) continue;
      const val = Number(r.rating) || 0;
      if (val <= 0) continue;

      if (!stats[r.product_id]) {
        stats[r.product_id] = { count: 0, average: 0 };
      }
      stats[r.product_id].count += 1;
      stats[r.product_id].average += val;
    }

    for (const pid of Object.keys(stats)) {
      stats[pid].average = stats[pid].count > 0 ? stats[pid].average / stats[pid].count : 0;
    }

    return stats;
  }, [reviews]);

  // Admin-configured featured cards (product selection + optional image
  // override); falls back to the first products when nothing is configured.
  const configured = homepageImages
    .filter((r) => r.is_active && r.slot_key.startsWith('featured_') && r.product_id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const configuredProducts = configured
    .map((row) => ({ row, product: products.find((p) => p.id === row.product_id) }))
    .filter((entry): entry is { row: (typeof configured)[number]; product: Product } => Boolean(entry.product));

  const featured = React.useMemo(() => {
    return configuredProducts.length > 0
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
  }, [configuredProducts, products, homepageSlots]);

  if (featured.length === 0) return null;

  return (
    <section className="hl">
      <div className="hl-head">
        <div className="sm" style={{ color: 'var(--au2)' }}>
          Featured product highlights
        </div>
        <h2 className="hl-title text-white" style={{ color: '#FFFFFF' }}>This Season&rsquo;s Standouts</h2>
      </div>

      <div className="hl-grid">
        {featured.map(({ product, image }) => {
          const stat = reviewStatsByProduct[product.id];
          return (
            <Link key={product.id} className="hl-card" to={`/product/${product.id}`}>
              <div className="hl-img">
                <img src={image} alt={product.name} loading="lazy" decoding="async" />
              </div>
              <div className="hl-body">
                <span className="sm hl-cat">{product.category}</span>
                <h3>{product.name}</h3>
                <span className="hl-price">
                  {settings.currency}
                  {product.price}
                </span>
                {stat && stat.count > 0 && (
                  <ProductCardRating rating={stat.average} count={stat.count} theme="dark" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
