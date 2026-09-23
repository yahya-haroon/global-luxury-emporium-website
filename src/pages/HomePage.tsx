import React from 'react';
import { PageLoader } from '../components/PageLoader';
import { HeroSequence } from '../components/HeroSequence';
import { TrustStrip } from '../components/TrustStrip';
import { Collection } from '../components/Collection';
import { OurStory } from '../components/OurStory';
import { useData } from '../context/DataContext';

export const HomePage: React.FC = () => {
  const { products, error } = useData();

  return (
    <>
      {/* Pop-in Page Loader */}
      <PageLoader />

      <main id="top">
        {/* Supabase Error notice if request fails */}
        {error && (
          <div
            style={{
              background: '#FDF2F2',
              borderBottom: '1px solid #F8B4B4',
              color: '#9B1C1C',
              padding: '12px 24px',
              textAlign: 'center',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Pinned Scroll-Driven Hero Sequence */}
        <HeroSequence products={products} />

        {/* Marquee Strip */}
        <TrustStrip />

        {/* The Collection (All Jackets) */}
        <Collection />

        {/* Our Story Band */}
        <OurStory />
      </main>
    </>
  );
};
