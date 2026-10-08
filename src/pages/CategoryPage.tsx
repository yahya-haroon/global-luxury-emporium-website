import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useParams, useLocation, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/SEO';
import { ProductCardRating } from '../components/ProductCardRating';
import { getProductSaleInfo } from '../lib/sales';
import {
  GenderFilter,
  CategorySlug,
  getAllCategories,
  getCategoryBySlug,
  filterProductsByGenderAndCategory,
  isCategorySlug,
} from '../lib/categories';

interface CategoryPageProps {
  gender?: GenderFilter;
  defaultCategory?: CategorySlug;
}

const BATCH_SIZE = 18;

export const CategoryPage: React.FC<CategoryPageProps> = ({
  gender: genderProp,
  defaultCategory = 'all',
}) => {
  const { categorySlug: routeSlug } = useParams<{ categorySlug?: string }>();
  const location = useLocation();
  const { products, sales, reviews, settings, customCategories } = useData();

  // 1. Resolve initial Gender from prop or URL
  const initialGender: GenderFilter = useMemo(() => {
    if (genderProp) return genderProp;
    if (location.pathname.startsWith('/women')) return 'women';
    if (location.pathname.startsWith('/men')) return 'men';
    return 'all';
  }, [genderProp, location.pathname]);

  const [selectedGender, setSelectedGender] = useState<GenderFilter>(initialGender);

  // Sync gender filter when navigating between top-level routes
  useEffect(() => {
    if (genderProp) {
      setSelectedGender(genderProp);
    } else if (location.pathname.startsWith('/women')) {
      setSelectedGender('women');
    } else if (location.pathname.startsWith('/men')) {
      setSelectedGender('men');
    } else if (location.pathname.startsWith('/category')) {
      setSelectedGender('all');
    }
  }, [genderProp, location.pathname]);

  // 2. Resolve Category Slug (defaults to 'all' if not specified)
  const activeSlug: CategorySlug = useMemo(() => {
    const raw = (routeSlug || defaultCategory || 'all').trim().toLowerCase();
    return isCategorySlug(raw, customCategories) ? raw : 'all';
  }, [routeSlug, defaultCategory, customCategories]);

  const categoryDef = getCategoryBySlug(activeSlug, customCategories) || getCategoryBySlug('all')!;

  const allNavCategories = useMemo(
    () => getAllCategories(customCategories),
    [customCategories]
  );

  // 3. Filter products by selected Gender + Category
  const categoryProducts = useMemo(() => {
    return filterProductsByGenderAndCategory(products, selectedGender, activeSlug, customCategories);
  }, [products, selectedGender, activeSlug, customCategories]);

  // 4. Continuous loading / infinite scroll state
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const observerTargetRef = useRef<HTMLDivElement | null>(null);

  // Reset pagination when gender or category changes
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedGender, activeSlug]);

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
    return <Navigate to="/category/all" replace />;
  }

  const genderLabel =
    selectedGender === 'all'
      ? 'All Collections'
      : selectedGender === 'men'
      ? "Men's Collection"
      : "Women's Collection";

  const pageTitle = categoryDef.metaTitle(selectedGender);
  const pageDescription = categoryDef.metaDescription(selectedGender);
  const canonicalPath =
    selectedGender === 'all'
      ? `/category/${categoryDef.slug}`
      : `/${selectedGender}/${categoryDef.slug}`;

  return (
    <main id="top">
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonical={canonicalPath}
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: genderLabel, item: canonicalPath },
          { name: categoryDef.title, item: canonicalPath },
        ]}
      />

      {/* Dark Category Strip with Category Selector and Gender Filter Pills */}
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
          flexWrap: 'wrap',
          gap: '16px',
          position: 'sticky',
          top: '0px',
          zIndex: 15,
        }}
      >
        {/* Left: Breadcrumb / Category Title */}
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
            {categoryDef.name}
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
            {selectedGender === 'all' ? 'All' : selectedGender === 'men' ? 'Men' : 'Women'} ({categoryProducts.length})
          </span>
        </div>

        {/* Center: Gender Filter Pills [All] [Men] [Women] */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '4px',
            borderRadius: '9999px',
            border: '1px solid rgba(201, 162, 74, 0.2)',
          }}
          aria-label="Filter by gender"
        >
          <span
            style={{
              fontSize: '10px',
              color: '#A89F8B',
              textTransform: 'uppercase',
              letterSpacing: '.16em',
              paddingLeft: '8px',
              paddingRight: '4px',
              fontWeight: 500,
            }}
          >
            Gender:
          </span>
          {(['all', 'men', 'women'] as const).map((g) => {
            const isSelected = selectedGender === g;
            const label = g === 'all' ? 'All' : g === 'men' ? 'Men' : 'Women';
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGender(g)}
                style={{
                  background: isSelected ? '#C9A24A' : 'transparent',
                  color: isSelected ? '#0E0D0B' : '#E5DFD3',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 500,
                  letterSpacing: '.14em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Right: Category Tabs Horizontal Scroll */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            paddingBottom: '2px',
          }}
          className="no-scrollbar"
          aria-label="Category sub-navigation"
        >
          {allNavCategories.map((cat) => {
            const isActive = cat.slug === activeSlug;
            const destLink =
              selectedGender === 'all'
                ? `/category/${cat.slug}`
                : `/${selectedGender}/${cat.slug}`;

            return (
              <Link
                key={cat.slug}
                to={destLink}
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
        {/* Continuous Product Grid */}
        {categoryProducts.length === 0 ? (
          <div className="collection-empty">
            <h3 className="font-serif text-2xl font-light tracking-wide text-text mb-3">No products found</h3>
            <p className="sm text-muted mb-6">
              No {selectedGender !== 'all' ? (selectedGender === 'men' ? "men's" : "women's") : ''}{' '}
              {categoryDef.title.toLowerCase()} are currently matching this selection.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {selectedGender !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedGender('all')}
                  className="pagination-btn"
                >
                  View All Genders ({categoryDef.title})
                </button>
              )}
              <Link
                to="/category/all"
                onClick={() => setSelectedGender('all')}
                className="pagination-btn"
              >
                View Full Catalog &rarr;
              </Link>
            </div>
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
                    to={`/product/${product.id}`}
                  >
                    <div className="c-img">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          loading={idx < 6 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="c-img-base"
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: '#1A1816',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#8A8175',
                            fontSize: '11px',
                            letterSpacing: '.16em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Handcrafted Leather
                        </div>
                      )}

                      {/* Second image hover flip */}
                      {product.images?.[1] && (
                        <img
                          src={product.images[1]}
                          alt={`${product.name} alternate view`}
                          loading="lazy"
                          decoding="async"
                          className="c-img-hover"
                        />
                      )}

                      {/* Discount Sale Badge */}
                      {saleInfo?.hasSale && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            zIndex: 4,
                            background: '#781D1D',
                            color: '#F7F3EA',
                            padding: '4px 9px',
                            fontSize: '10px',
                            letterSpacing: '.18em',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}
                        >
                          {saleInfo.discountPercentage > 0
                            ? `-${Math.round(saleInfo.discountPercentage)}%`
                            : 'SALE'}
                        </div>
                      )}
                    </div>

                    <div className="c-body">
                      <div className="c-cat sm">{product.category || 'Handcrafted'}</div>
                      <div className="c-name">{product.name}</div>

                      <div className="c-price-row">
                        {saleInfo?.hasSale ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span
                              style={{
                                color: '#A84332',
                                fontWeight: 600,
                                fontSize: '15px',
                              }}
                            >
                              {currency}
                              {saleInfo.salePrice.toFixed(2)}
                            </span>
                            <span
                              style={{
                                color: '#8A8175',
                                textDecoration: 'line-through',
                                fontSize: '12px',
                              }}
                            >
                              {currency}
                              {product.price.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <div className="c-price">
                            {currency}
                            {product.price.toFixed(2)}
                          </div>
                        )}
                      </div>

                      {/* Star Rating snippet */}
                      {stat && stat.count > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <ProductCardRating rating={stat.average} count={stat.count} />
                        </div>
                      )}
                    </div>
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
