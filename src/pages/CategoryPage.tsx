import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useLocation, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/SEO';
import { ProductCardRating } from '../components/ProductCardRating';
import { getProductSaleInfo } from '../lib/sales';
import {
  Gender,
  CategorySlug,
  CATEGORY_LIST,
  getCategoryBySlug,
  filterProductsByGenderAndCategory,
  isCategorySlug,
} from '../lib/categories';

interface CategoryPageProps {
  gender?: Gender;
  defaultCategory?: CategorySlug;
}

const BATCH_SIZE = 18;

export const CategoryPage: React.FC<CategoryPageProps> = ({
  gender: genderProp,
  defaultCategory = 'all',
}) => {
  const { categorySlug: routeSlug } = useParams<{ categorySlug?: string }>();
  const location = useLocation();
  const { products, sales, reviews, settings } = useData();

  // 1. Resolve strict Gender (men or women)
  const gender: Gender = useMemo(() => {
    if (genderProp) return genderProp;
    if (location.pathname.startsWith('/women')) return 'women';
    if (location.pathname.startsWith('/men')) return 'men';
    return 'men';
  }, [genderProp, location.pathname]);

  // 2. Resolve Category Slug (defaults to 'all' if not specified)
  const activeSlug: CategorySlug = useMemo(() => {
    const raw = (routeSlug || defaultCategory || 'all').trim().toLowerCase();
    return isCategorySlug(raw) ? raw : 'all';
  }, [routeSlug, defaultCategory]);

  const categoryDef = getCategoryBySlug(activeSlug);

  // 3. Filter products strictly by Gender + Category (never mix Men & Women)
  const categoryProducts = useMemo(() => {
    return filterProductsByGenderAndCategory(products, gender, activeSlug);
  }, [products, gender, activeSlug]);

  // 4. Continuous loading / infinite scroll state
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when gender or category changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [gender, activeSlug]);

  const displayedProducts = useMemo(() => {
    return categoryProducts.slice(0, visibleCount);
  }, [categoryProducts, visibleCount]);

  const hasMore = visibleCount < categoryProducts.length;

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, categoryProducts.length));
    }
  }, [hasMore, categoryProducts.length]);

  useEffect(() => {
    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          handleLoadMore();
        }
      },
      { rootMargin: '300px 0px', threshold: 0.05 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMore, hasMore]);

  // 5. Precompute published review stats per product
  const reviewStatsByProduct = useMemo(() => {
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

  if (!categoryDef) {
    return <Navigate to={`/${gender}/all`} replace />;
  }

  const genderLabel = gender === 'men' ? 'Men' : 'Women';
  const pageTitle = categoryDef.metaTitle(gender);
  const pageDescription = categoryDef.metaDescription(gender);

  return (
    <main id="top">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={`/${gender}/${categoryDef.slug}`}
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: `${genderLabel}'s Collection`, item: `/${gender}/${categoryDef.slug}` },
          { name: categoryDef.title, item: `/${gender}/${categoryDef.slug}` },
        ]}
      />

      {/* Dark Category Strip for Options (like header) */}
      <div
        className="dark-category-strip"
        style={{
          backgroundColor: '#0E0D0B',
          color: '#F7F3EA',
          borderBottom: '1px solid rgba(201, 162, 74, 0.25)',
          padding: '12px var(--px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          overflowX: 'auto',
          position: 'sticky',
          top: '0px',
          zIndex: 15,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span
            className="sm"
            style={{
              color: 'var(--au2, #C9A24A)',
              fontWeight: 600,
              letterSpacing: '.24em',
              textTransform: 'uppercase',
              fontSize: '11px',
            }}
          >
            {genderLabel}
          </span>
          <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: '11px' }}>/</span>
          <span
            className="sm"
            style={{
              color: '#F7F3EA',
              fontWeight: 500,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              fontSize: '11px',
            }}
          >
            {categoryDef.name}
          </span>
        </div>

        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '22px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '2px',
          }}
          className="no-scrollbar"
        >
          {CATEGORY_LIST.map((cat) => {
            const isActive = cat.slug === activeSlug;
            return (
              <Link
                key={cat.slug}
                to={`/${gender}/${cat.slug}`}
                style={{
                  color: isActive ? '#C9A24A' : '#A89F8B',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '12px',
                  letterSpacing: '.16em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  padding: '6px 0',
                  borderBottom: isActive ? '2px solid #C9A24A' : '2px solid transparent',
                  transition: 'color 0.2s, border-color 0.2s',
                  flexShrink: 0,
                }}
                className="hover:text-white"
              >
                {cat.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <section
        className="collection-section"
        style={{ minHeight: '85vh', paddingTop: '36px', paddingBottom: '120px' }}
      >
        {/* Continuous Product Grid - Reuses exact existing .grid-3col & .c classes */}
        {categoryProducts.length === 0 ? (
          <div className="collection-empty">
            <h3>No products found</h3>
            <p className="sm">
              No {gender === 'men' ? "men's" : "women's"} {categoryDef.title.toLowerCase()} are currently in this collection.
            </p>
            <Link
              to={gender === 'men' ? '/men/all' : '/women/all'}
              className="pagination-btn"
            >
              View All {gender === 'men' ? "Men's" : "Women's"} Jackets &rarr;
            </Link>
          </div>
        ) : (
          <>
            <div className="grid-3col" id="grid">
              {displayedProducts.map((product, idx) => {
                const stat = reviewStatsByProduct[product.id];
                const saleInfo = getProductSaleInfo(product, sales);
                const currency = settings?.currency || '£';

                return (
                  <Link
                    key={product.id || idx}
                    className="c r in"
                    style={{ '--d': `${(idx % 3) * 0.12}s` } as React.CSSProperties}
                    tabIndex={0}
                    to={`/product/${product.id}`}
                  >
                    <div className="sm" style={{ color: 'var(--au)', marginBottom: '12px' }}>
                      0{idx + 1}
                    </div>
                    <div className="ph">
                      <img
                        src={product.images[0] || `/assets/products/product-${(idx % 3) + 1}-main.jpg`}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                      />
                      {product.images[1] && (
                        <img
                          src={product.images[1]}
                          alt={`${product.name} alternate view`}
                          loading="lazy"
                          decoding="async"
                          className="image-hover-crossfade"
                        />
                      )}
                      {saleInfo.hasSale && (
                        <span className="product-sale-badge sm">
                          {saleInfo.discountPercentage}% OFF
                        </span>
                      )}
                    </div>
                    <div className="ci">
                      <h3>{product.name}</h3>
                      {saleInfo.hasSale ? (
                        <div className="price-wrap">
                          <span className="price-old">
                            {currency}{saleInfo.originalPrice.toFixed(2)}
                          </span>
                          <span className="price-sale">
                            {currency}{saleInfo.salePrice.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span>
                          {currency}{product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {stat && stat.count > 0 && (
                      <ProductCardRating rating={stat.average} count={stat.count} theme="light" />
                    )}
                    <span className="vw sm">View piece &rarr;</span>
                  </Link>
                );
              })}
            </div>

            {/* Continuous Infinite Scrolling Sentinel */}
            {hasMore && (
              <div
                ref={observerTargetRef}
                style={{
                  padding: '48px 0',
                  textAlign: 'center',
                }}
              >
                <span className="sm" style={{ color: 'var(--mu)', letterSpacing: '.18em' }}>
                  Loading more pieces…
                </span>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default CategoryPage;
