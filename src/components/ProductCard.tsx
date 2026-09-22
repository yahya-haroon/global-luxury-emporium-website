import React from 'react';
import { Product, Settings } from '../types';

interface ProductCardProps {
  product: Product;
  settings: Settings;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, settings, onSelect }) => {
  const mainImage = product.images[0] || '/assets/products/shearling-aviator-jacket-main.png';
  const hoverImage = product.images[1]; // Optional secondary image

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(product);
    }
  };

  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={`View ${product.name}, price ${settings.currency}${product.price.toFixed(2)}`}
      onClick={() => onSelect(product)}
      onKeyDown={handleKeyDown}
      className="product-card group flex flex-col text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded p-2 transition-transform duration-300 hover:-translate-y-1"
    >
      {/* 4:5 Image Container with Gold Inner Frame and Hover Crossfade */}
      <div className="product-frame shadow-sm rounded-sm">
        {/* Main Image */}
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />

        {/* Hover / Focus Secondary Image Crossfade */}
        {hoverImage && (
          <img
            src={hoverImage}
            alt={`${product.name} alternate angle`}
            className="image-hover-crossfade"
          />
        )}
      </div>

      {/* Product Details */}
      <div className="pt-4 pb-2 flex flex-col items-center">
        <h3 className="font-serif text-2xl text-text group-hover:text-gold-dark transition-colors duration-200">
          {product.name}
        </h3>
        <p className="mt-1 text-gold font-medium text-lg tracking-wide">
          {settings.currency}{product.price.toFixed(2)}
        </p>
      </div>
    </article>
  );
};
