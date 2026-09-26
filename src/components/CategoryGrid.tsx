import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DEFAULT_CATEGORY_TILE_IMAGES, isVideoMedia } from '../lib/homepageImages';

export const CategoryGrid: React.FC = () => {
  const { products, setActiveCategory, homepageSlots } = useData();
  const tiles = products.slice(0, 4);

  const menSlot = homepageSlots.category_men;
  const menSrc = menSlot?.image_url || '/assets/products/product-3-detail.jpg';
  const menIsVideo = isVideoMedia(menSlot);
  const menTitle = menSlot?.title?.trim() || "Men's jackets";

  const womenSlot = homepageSlots.category_women;
  const womenSrc = womenSlot?.image_url || '/assets/products/product-2-detail.jpg';
  const womenIsVideo = isVideoMedia(womenSlot);
  const womenTitle = womenSlot?.title?.trim() || "Women's jackets";

  const goCategory = (categoryTitle: string) => {
    // Check if category title directly matches any product's category
    const directMatch = products.find(
      (p) => p.category?.trim().toLowerCase() === categoryTitle.trim().toLowerCase()
    );
    if (directMatch) {
      setActiveCategory(directMatch.category);
    } else {
      const lower = categoryTitle.toLowerCase();
      if (lower.includes('women') || lower.includes('ladies')) {
        setActiveCategory('Women');
      } else if (lower.includes('men') || lower.includes('gent')) {
        setActiveCategory('Men');
      } else {
        setActiveCategory(categoryTitle);
      }
    }
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="cat-sec" aria-label="Shop by category">
      <div className="cat-grid">
        <button type="button" className="cat-tile wide" onClick={() => goCategory(menTitle)}>
          {menIsVideo ? (
            <video
              src={menSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={menSrc}
              alt={menSlot?.alt_text || "Close detail of a men's black racer leather jacket"}
              loading="lazy"
            />
          )}
          <span className="cat-shade" aria-hidden="true" />
          <span className="cat-label sm">{menTitle}</span>
        </button>

        <button type="button" className="cat-tile wide" onClick={() => goCategory(womenTitle)}>
          {womenIsVideo ? (
            <video
              src={womenSrc}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={womenSrc}
              alt={womenSlot?.alt_text || "Close detail of a women's quilted burgundy biker leather jacket"}
              loading="lazy"
            />
          )}
          <span className="cat-shade" aria-hidden="true" />
          <span className="cat-label sm">{womenTitle}</span>
        </button>

        {tiles.map((product, index) => {
          const tileSlot = homepageSlots[`category_${index + 1}`];
          const assignedProduct =
            tileSlot?.product_id
              ? products.find((p) => p.id === tileSlot.product_id)
              : product;
          const currentProduct = assignedProduct || product;

          const src =
            tileSlot?.image_url ||
            DEFAULT_CATEGORY_TILE_IMAGES[currentProduct.id] ||
            currentProduct.images[0];

          const isVideo = isVideoMedia(tileSlot) || (typeof src === 'string' && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(src));
          const tileTitle = tileSlot?.title?.trim() || currentProduct.name;
          const tileAlt = tileSlot?.alt_text || currentProduct.name;

          return (
            <Link key={currentProduct.id} className="cat-tile" to={`/product/${currentProduct.id}`}>
              {isVideo ? (
                <video
                  src={src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  src={src}
                  alt={tileAlt}
                  loading="lazy"
                />
              )}
              <span className="cat-shade" aria-hidden="true" />
              <span className="cat-label sm">{tileTitle}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
