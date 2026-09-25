import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DEFAULT_CATEGORY_TILE_IMAGES, isVideoMedia } from '../lib/homepageImages';

export const CategoryGrid: React.FC = () => {
  const { products, setActiveCategory, homepageSlots } = useData();
  const tiles = products.slice(0, 4);

  const goCategory = (category: string) => {
    setActiveCategory(category);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const menSlot = homepageSlots.category_men;
  const menSrc = menSlot?.image_url || '/assets/products/product-3-detail.jpg';
  const menIsVideo = isVideoMedia(menSlot);

  const womenSlot = homepageSlots.category_women;
  const womenSrc = womenSlot?.image_url || '/assets/products/product-2-detail.jpg';
  const womenIsVideo = isVideoMedia(womenSlot);

  const tileImage = (index: number, product: (typeof tiles)[number]) =>
    homepageSlots[`category_${index + 1}`]?.image_url ||
    DEFAULT_CATEGORY_TILE_IMAGES[product.id] ||
    product.images[0];

  const tileAlt = (index: number, product: (typeof tiles)[number]) =>
    homepageSlots[`category_${index + 1}`]?.alt_text || product.name;

  return (
    <section className="cat-sec" aria-label="Shop by category">
      <div className="cat-grid">
        <button type="button" className="cat-tile wide" onClick={() => goCategory('Men')}>
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
          <span className="cat-label sm">Men&rsquo;s jackets</span>
        </button>

        <button type="button" className="cat-tile wide" onClick={() => goCategory('Women')}>
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
          <span className="cat-label sm">Women&rsquo;s jackets</span>
        </button>

        {tiles.map((product, index) => {
          const tileSlot = homepageSlots[`category_${index + 1}`];
          const src = tileImage(index, product);
          const isVideo = isVideoMedia(tileSlot) || (typeof src === 'string' && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(src));

          return (
            <Link key={product.id} className="cat-tile" to={`/product/${product.id}`}>
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
                  alt={tileAlt(index, product)}
                  loading="lazy"
                />
              )}
              <span className="cat-shade" aria-hidden="true" />
              <span className="cat-label sm">{product.name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
