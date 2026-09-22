import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Product } from '../types';

interface CollectionProps {
  onSelectProduct?: (product: Product) => void;
}

export const Collection: React.FC<CollectionProps> = () => {
  const { products, activeCategory, setActiveCategory } = useData();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const categories = ['All', 'Women', 'Men'];

  const filteredProducts = products.filter(
    (p) => activeCategory === 'All' || p.category.toLowerCase() === activeCategory.toLowerCase()
  );

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
  }, [filteredProducts, activeCategory]);

  return (
    <section id="shop" className="collection-section">
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
        {filteredProducts.map((product, idx) => (
          <Link
            key={product.id || idx}
            className="c r"
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
        ))}
      </div>
    </section>
  );
};
