import React, { useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { isVideoMedia } from '../lib/homepageImages';

const STORY_TEXT =
  'Global Luxury Emporium Ltd is a UK company in London. Every jacket is cut and stitched in our own factory in Pakistan, so we control the leather, the finish and the fit from start to delivery.';

const DEFAULT_IMG = '/assets/models/campaign-quilted.jpg';
const DEFAULT_ALT = 'Model wearing a quilted burgundy biker leather jacket against a brick wall';

export const OurStory: React.FC = () => {
  const { homepageSlots } = useData();
  const sectionRef = useRef<HTMLElement | null>(null);
  const wordsRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    if (wordsRef.current) {
      observer.observe(wordsRef.current);
    }

    const rightImg = sectionRef.current?.querySelector('img.r, video.r');
    if (rightImg) {
      observer.observe(rightImg);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const words = STORY_TEXT.split(' ');
  const isVideo = isVideoMedia(homepageSlots.editorial_story);

  return (
    <section className="ed" id="story" ref={sectionRef}>
      <div className="ed-two">
        <div className="ed-text">
          <div className="sm" style={{ color: 'var(--au)', marginBottom: '20px' }}>
            The icon reimagined
          </div>
          <h2 className="ed-title">
            Premium Leather, Built for the Ride of Life.
          </h2>
          <p className="wr" id="wr" ref={wordsRef}>
            {words.map((word, i) => (
              <span key={i} style={{ '--d': `${i * 0.035}s` } as React.CSSProperties}>
                {word}{' '}
              </span>
            ))}
          </p>
          <p className="ed-desc">Designed in London. Made in our own factory. Shipped worldwide.</p>
        </div>
        <div className="ed-img">
          {isVideo ? (
            <video
              className="r w-full h-full object-cover"
              src={homepageSlots.editorial_story?.image_url || DEFAULT_IMG}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              className="r"
              src={homepageSlots.editorial_story?.image_url || DEFAULT_IMG}
              alt={homepageSlots.editorial_story?.alt_text ?? DEFAULT_ALT}
              loading="lazy"
            />
          )}
        </div>
      </div>
    </section>
  );
};
