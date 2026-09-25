import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Product } from '../types';

interface CollectionProps {
  onSelectProduct?: (product: Product) => void;
}

const PAGE_SIZE = 9;

export const Collection: React.FC<CollectionProps> = () => {
  const { products, activeCategory, setActiveCategory } = useData();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const categories = ['All', 'Women', 'Men'];

  const filteredProducts = products.filter(
    (p) => activeCategory === 'All' || p.category.toLowerCase() === activeCategory.toLowerCase()
  );

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const startIndex = currentPage * PAGE_SIZE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);

  // Reset to the first page whenever the filter changes.
  useEffect(() => {
    setCurrentPage(0);
  }, [activeCategory]);

  // Keep the current page in range if the product list shrinks.
  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    const elements = document.querySelectorAll('.collection-section .r:not(.in)');
    elements.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, [paginatedProducts, currentPage, activeCategory]);

  const goToPage = (page: number) => {
    const clamped = Math.min(Math.max(page, 0), totalPages - 1);
    setCurrentPage(clamped);
    // Bring the top of the collection back into view so the customer sees
    // the beginning of the new page.
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="shop" className="collection-section" ref={sectionRef}>
      {/* Header with Title & Filter Tabs */}
      <div className="top">
        <div>
          <div className="sm" style={{ color: 'var(--au)' }}>
            Collection
          </div>
          <h2 className="section-title">The jackets</h2>
        </div>

        <div className="tabs" id="tabs">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`sm ${activeCategory === cat ? 'on' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Grid with 70px middle-column offset */}
      <div className="grid-3col" id="grid">
        {paginatedProducts.map((product, idx) => {
          const globalIndex = startIndex + idx;
          return (
            <Link
              key={product.id || globalIndex}
              className="c r"
              style={{ '--d': `${(idx % 3) * 0.12}s` } as React.CSSProperties}
              tabIndex={0}
              to={`/product/${product.id}`}
            >
              <div className="sm" style={{ color: 'var(--au)', marginBottom: '12px' }}>
                0{globalIndex + 1}
              </div>
              <div className="ph">
                <img
                  src={product.images[0] || `/assets/products/product-${(idx % 3) + 1}-main.jpg`}
                  alt={product.name}
                />
                <img
                  className="h"
                  src={product.images[1] || `/assets/products/product-${(idx % 3) + 1}-detail.jpg`}
                  alt=""
                  aria-hidden="true"
                />
              </div>
              <div className="ci">
                <h3>{product.name}</h3>
                <span>£{product.price}</span>
              </div>
              <span className="vw sm">View piece &rarr;</span>
            </Link>
          );
        })}
      </div>

      {/* Client-side pagination controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
            aria-label="Previous products"
          >
            &larr; Previous
          </button>

          <span className="pagination-indicator sm" aria-live="polite">
            {currentPage + 1} / {totalPages}
          </span>

          <button
            type="button"
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
            aria-label="Next products"
          >
            Next &rarr;
          </button>
        </div>
      )}
    </section>
  );
};
