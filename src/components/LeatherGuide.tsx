import React from 'react';
import { useData } from '../context/DataContext';
import { isVideoMedia } from '../lib/homepageImages';

const CARE_STEPS = [
  'Store on a wide hanger so the shoulders keep their shape.',
  'If it gets wet, let it dry naturally, away from direct heat.',
  'Keep it out of prolonged moisture and strong sunlight.',
  'Condition the leather occasionally to keep it supple.',
];

export const LeatherGuide: React.FC = () => {
  const { products, homepageSlots } = useData();
  const guideSlot = homepageSlots.leather_guide;
  const guideImage = guideSlot?.image_url || null;
  const isVideo = isVideoMedia(guideSlot);

  const sizes = Array.from(
    new Set(
      products.flatMap((p) =>
        p.sizes
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    )
  );

  const scrollToShop = () => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="guide">
      <div className="guide-head">
        <div className="sm" style={{ color: 'var(--au)' }}>
          The leather guide
        </div>
        <h2 className="guide-title">Everything You Need to Know Before You Buy</h2>
      </div>

      <div className={`guide-two ${guideImage ? 'with-img' : ''}`}>
        <div className="guide-block">
          <h3>Size &amp; Fit</h3>
          <p>
            Every product page lists the sizes available for that piece. Across the collection we
            currently stock the sizes below — choose your usual size, and on pieces that allow it,
            add personalisation or additional requirements at checkout.
          </p>
          {sizes.length > 0 && (
            <div className="guide-sizes">
              {sizes.map((size) => (
                <span key={size} className="guide-size sm">
                  {size}
                </span>
              ))}
            </div>
          )}
          <button type="button" className="why-cta sm" onClick={scrollToShop}>
            Find your jacket &rarr;
          </button>
        </div>

        {guideImage && (
          <div className="guide-img">
            {isVideo ? (
              <video
                src={guideImage}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={guideImage} alt={guideSlot?.alt_text || 'Leather jacket guide'} loading="lazy" />
            )}
          </div>
        )}

        <div className="guide-block">
          <h3>Care Instructions</h3>
          <ul className="guide-list">
            {CARE_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
