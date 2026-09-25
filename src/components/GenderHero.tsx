import React from 'react';
import { useData } from '../context/DataContext';
import { HOMEPAGE_SLOTS, isVideoMedia } from '../lib/homepageImages';

interface HeroPanel {
  slotKey: string;
  category: string;
  label: string;
  defaultImg: string;
  defaultAlt: string;
}

const PANELS: HeroPanel[] = [
  {
    slotKey: 'hero_men',
    category: 'Men',
    label: 'For Men',
    defaultImg: HOMEPAGE_SLOTS.find((s) => s.key === 'hero_men')?.defaultUrl || '/assets/models/campaign-racer.png',
    defaultAlt: HOMEPAGE_SLOTS.find((s) => s.key === 'hero_men')?.defaultAlt || 'Male model wearing a classic black racer leather jacket',
  },
  {
    slotKey: 'hero_women',
    category: 'Women',
    label: 'For Women',
    defaultImg: HOMEPAGE_SLOTS.find((s) => s.key === 'hero_women')?.defaultUrl || '/assets/models/campaign-shearling.jpg',
    defaultAlt: HOMEPAGE_SLOTS.find((s) => s.key === 'hero_women')?.defaultAlt || 'Female model wearing a shearling aviator leather jacket',
  },
];

export const GenderHero: React.FC = () => {
  const { setActiveCategory, homepageSlots } = useData();

  const shopCategory = (category: string) => {
    setActiveCategory(category);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="split-hero" aria-label="Shop by gender">
      <h1 className="sr-only">
        Global Luxury Emporium — premium leather jackets for men and women
      </h1>

      {PANELS.map((panel) => {
        const slot = homepageSlots[panel.slotKey];
        const isVideo = isVideoMedia(slot);
        const img = slot?.image_url || panel.defaultImg;
        const alt = slot?.alt_text ?? panel.defaultAlt;

        return (
          <button
            key={panel.category}
            type="button"
            className="split-panel"
            onClick={() => shopCategory(panel.category)}
            aria-label={`Shop the ${panel.category}'s collection`}
          >
            {isVideo ? (
              <video
                src={img}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img src={img} alt={alt} />
            )}
            <span className="split-shade" aria-hidden="true" />
            <span className="split-copy">
              <span className="split-label">{panel.label}</span>
              <span className="split-cta sm">Shop now &rarr;</span>
            </span>
          </button>
        );
      })}
    </section>
  );
};
