import React, { useEffect, useRef } from 'react';

const STORY_TEXT =
  'Global Luxury Emporium Ltd is a UK company in London. Every jacket is cut and stitched in our own factory in Pakistan, so we control the leather, the finish and the fit from start to delivery.';

export const OurStory: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
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

    const rightImg = sectionRef.current?.querySelector('img.r');
    if (rightImg) {
      observer.observe(rightImg);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const words = STORY_TEXT.split(' ');

  return (
    <div className="dk" id="story" ref={sectionRef}>
      <div className="two">
        <div>
          <div className="sm" style={{ color: 'var(--au2)', marginBottom: '24px' }}>
            Our story
          </div>
          <p className="wr" id="wr" ref={wordsRef}>
            {words.map((word, i) => (
              <span
                key={i}
                style={{ '--d': `${i * 0.035}s` } as React.CSSProperties}
              >
                {word}{' '}
              </span>
            ))}
          </p>
        </div>
        <div>
          <img
            className="r"
            src="/assets/logo-main.jpg"
            alt="Global Luxury Emporium"
          />
        </div>
      </div>
    </div>
  );
};
