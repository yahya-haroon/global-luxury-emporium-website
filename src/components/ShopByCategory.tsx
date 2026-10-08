import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getCategoryFallbackImage, HomepageCategory } from '../lib/homepageCategories';

export const ShopByCategory: React.FC = () => {
  const { homepageCategories } = useData();

  // Filter only active categories, sorted by display_order
  const activeCategories = (homepageCategories || [])
    .filter((cat) => cat.is_active)
    .sort((a, b) => a.display_order - b.display_order);

  if (activeCategories.length === 0) {
    return null;
  }

  // Dynamic grid column layout adapting responsively to category count
  const getGridClasses = (count: number) => {
    switch (count) {
      case 1:
        return 'grid grid-cols-1 max-w-md mx-auto';
      case 2:
        return 'grid grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto gap-6 sm:gap-8';
      case 3:
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto gap-6 sm:gap-8';
      case 4:
        return 'grid grid-cols-2 md:grid-cols-4 max-w-7xl mx-auto gap-4 sm:gap-6';
      case 5:
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 max-w-7xl mx-auto gap-4 sm:gap-6';
      case 6:
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 max-w-7xl mx-auto gap-4 sm:gap-6';
      default:
        // 7+ categories: 2 cols on mobile, 3 on tablet, 4 on desktop
        return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-7xl mx-auto gap-4 sm:gap-6';
    }
  };

  return (
    <section
      className="shop-by-category-section py-16 sm:py-24 px-4 sm:px-8 border-b border-hairline bg-ivory"
      aria-label="Shop by category"
    >
      <div className="max-w-7xl mx-auto">
        {/* Editorial Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-gold block mb-2">
            Curated Silhouettes
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-text font-normal tracking-wide uppercase">
            Shop by Category
          </h2>
          <div className="w-12 h-px bg-gold/50 mx-auto my-3" />
          <p className="text-xs sm:text-sm text-muted font-light tracking-wider leading-relaxed">
            Explore handcrafted pieces tailored from Italian lambskin, plush shearling, and structured wool.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className={getGridClasses(activeCategories.length)}>
          {activeCategories.map((category, idx) => (
            <CategoryCard key={category.id || idx} category={category} priority={idx < 4} />
          ))}
        </div>
      </div>
    </section>
  );
};

const CategoryCard: React.FC<{ category: HomepageCategory; priority?: boolean }> = ({
  category,
  priority = false,
}) => {
  const [imageError, setImageError] = useState(false);

  const fallbackSrc = getCategoryFallbackImage(category.destination_category);
  const imageSrc = !imageError && category.image_url ? category.image_url : fallbackSrc;
  const destinationUrl = `/category/${category.destination_category || 'all'}`;

  return (
    <Link
      to={destinationUrl}
      className="group relative block overflow-hidden rounded-[2px] bg-[#161412] shadow-sm hover:shadow-xl transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-gold/60"
      aria-label={`Explore ${category.name}`}
    >
      {/* Aspect Ratio Container (Portrait fashion crop) */}
      <div className="relative aspect-[4/5] w-full overflow-hidden">
        <img
          src={imageSrc}
          alt={category.alt_text || category.name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700 ease-out"
        />

        {/* Elegant Luxury Gradient & Vignette Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-300 group-hover:opacity-90"
          aria-hidden="true"
        />

        {/* Subtle Gold Border Hover Accent */}
        <div
          className="absolute inset-0 border border-transparent group-hover:border-gold/40 transition-colors duration-500 pointer-events-none"
          aria-hidden="true"
        />

        {/* Bottom Content Info */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 flex flex-col justify-end text-left z-10">
          <span className="text-[10px] uppercase tracking-[0.2em] text-gold/80 font-medium mb-1 drop-shadow-sm">
            Collection
          </span>
          <h3 className="font-serif text-base sm:text-lg md:text-xl text-[#F7F3EA] font-normal tracking-wide uppercase leading-tight drop-shadow-md">
            {category.name}
          </h3>

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] tracking-[0.16em] uppercase text-[#E5DFD3]/90 font-medium transform translate-y-1 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 group-hover:text-gold transition-all duration-300">
            <span>Explore</span>
            <span className="transform group-hover:translate-x-1 transition-transform duration-300">&rarr;</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ShopByCategory;
