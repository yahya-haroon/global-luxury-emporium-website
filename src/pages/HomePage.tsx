import React from 'react';
import { PageLoader } from '../components/PageLoader';
import { GenderHero } from '../components/GenderHero';
import { TrustStrip } from '../components/TrustStrip';
import { OurStory } from '../components/OurStory';
import { CategoryGrid } from '../components/CategoryGrid';
import { FeaturedGallery } from '../components/FeaturedGallery';
import { Collection } from '../components/Collection';
import { WhyChoose } from '../components/WhyChoose';
import { FeaturedHighlights } from '../components/FeaturedHighlights';
import { LeatherGuide } from '../components/LeatherGuide';
import { Testimonials } from '../components/Testimonials';
import { Faq } from '../components/Faq';
import { ContactSection } from '../components/ContactSection';
import { useData } from '../context/DataContext';

export const HomePage: React.FC = () => {
  const { error } = useData();

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

        {/* 3. Split FOR MEN / FOR WOMEN hero */}
        <GenderHero />

        {/* Marquee trust strip */}
        <TrustStrip />

        {/* 4. Editorial story band */}
        <OurStory />

        {/* 5. Visual category discovery mosaic */}
        <CategoryGrid />

        {/* 6. Product discovery: admin gallery lead-in + collection */}
        <FeaturedGallery />
        <Collection />

        {/* 7. Why Choose Our Leather editorial carousel */}
        <WhyChoose />

        {/* 8. Featured product highlights on dark */}
        <FeaturedHighlights />

        {/* 9. Leather size & care guide */}
        <LeatherGuide />

        {/* 10. Customer testimonials (real published reviews) */}
        <Testimonials />

        {/* 11. FAQ accordion */}
        <Faq />

        {/* 12. Contact section */}
        <ContactSection />
      </main>
    </>
  );
};
