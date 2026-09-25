import React, { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataContext';
import { DEFAULT_WHY_SLIDES, isVideoMedia } from '../lib/homepageImages';

interface FeatureSlide {
  title: string;
  text: string;
  img: string;
  alt: string;
  isVideo?: boolean;
}

const ROTATION_MS = 5000;

export const WhyChoose: React.FC = () => {
  const { homepageImages } = useData();
  const sectionRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const touchStartX = useRef<number | null>(null);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped on every manual navigation so the auto-rotate timer restarts.
  const [restartKey, setRestartKey] = useState(0);
  const [reduceMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // Slides are admin-configured rows (image + copy stay paired per row),
  // ordered by sort_order; bundled defaults are used when nothing is configured.
  const configured = homepageImages
    .filter((r) => r.is_active && r.slot_key.startsWith('why_choose_'))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const slides: FeatureSlide[] =
    configured.length > 0
      ? configured.map((row) => {
          const fallback = DEFAULT_WHY_SLIDES.find((d) => d.key === row.slot_key);
          return {
            title: row.title || fallback?.title || '',
            text: row.description || fallback?.text || '',
            img: row.image_url || fallback?.img || '',
            alt: row.alt_text ?? fallback?.alt ?? '',
            isVideo: isVideoMedia(row),
          };
        })
      : DEFAULT_WHY_SLIDES.map((d) => ({ title: d.title, text: d.text, img: d.img, alt: d.alt, isVideo: false }));

  useEffect(() => {
    if (index >= slides.length) {
      setIndex(0);
    }
  }, [slides.length, index]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = sectionRef.current?.querySelectorAll('.r:not(.in)');
    elements?.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Auto-advance every 5s; paused on hover and disabled for reduced motion.
  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, [paused, restartKey, reduceMotion]);

  const goTo = (next: number) => {
    setIndex(((next % slides.length) + slides.length) % slides.length);
    setRestartKey((k) => k + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 40) {
      goTo(delta < 0 ? index + 1 : index - 1);
    }
  };

  const exploreCollection = () => {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const slide = slides[index];

  return (
    <section
      className="why"
      id="why"
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Why choose our leather"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="why-wrap">
        {/* Left: editorial copy */}
        <div className="why-text r">
          <div className="sm" style={{ color: 'var(--au)' }}>
            Why choose our leather
          </div>
          <h2 className="why-title">
            Built for Quality.
            <br />
            Designed for Life.
          </h2>
          <p className="why-intro">
            Six reasons our jackets are made to be worn for years, not seasons. Explore what
            shapes every piece we make.
          </p>

          <div key={index} className="why-copy" aria-live="polite">
            <div className="why-meta">
              <span className="why-count sm">
                {String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
              <span className="why-rule" aria-hidden="true" />
            </div>
            <h3 className="why-slide-title">{slide.title}</h3>
            <p className="why-slide-text">{slide.text}</p>
          </div>

          <button type="button" className="why-cta sm" onClick={exploreCollection}>
            Explore &rarr;
          </button>
        </div>

        {/* Right: rotating image stage with arrows and dots */}
        <div
          className="why-stage r"
          style={{ '--d': '0.12s' } as React.CSSProperties}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((s, i) =>
            s.isVideo ? (
              <video
                key={s.title}
                src={s.img}
                autoPlay
                loop
                muted
                playsInline
                aria-hidden={i === index ? undefined : true}
                className={i === index ? 'on' : ''}
              />
            ) : (
              <img
                key={s.title}
                src={s.img}
                alt={i === index ? s.alt : ''}
                aria-hidden={i === index ? undefined : true}
                className={i === index ? 'on' : ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            )
          )}

          <button
            type="button"
            className="why-arrow prev"
            onClick={() => goTo(index - 1)}
            aria-label="Previous feature"
          >
            &larr;
          </button>
          <button
            type="button"
            className="why-arrow next"
            onClick={() => goTo(index + 1)}
            aria-label="Next feature"
          >
            &rarr;
          </button>

          <div className="why-dots">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                className={`why-dot ${i === index ? 'on' : ''}`}
                onClick={() => goTo(i)}
                aria-label={`Show feature ${i + 1}: ${s.title}`}
                aria-current={i === index ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
