import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface GallerySlide {
  id: string;
  image_url: string;
  alt_text: string;
}

// Default rotation interval (ms). A calm, luxury-appropriate pace.
const ROTATION_INTERVAL = 5000;

/**
 * Admin-controlled rotating featured gallery.
 *
 * - Reads only ACTIVE featured images (public RLS read).
 * - Cross-fades between images without reloading the page.
 * - Provides optional prev/next controls and progress dots.
 * - Fails gracefully: renders nothing if unconfigured, empty, or on error.
 */
export const FeaturedGallery: React.FC = () => {
  const [slides, setSlides] = useState<GallerySlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isSupabaseConfigured) {
        setLoaded(true);
        return;
      }

      const { data, error } = await supabase
        .from('featured_images')
        .select('id, image_url, alt_text')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (!error && Array.isArray(data) && data.length > 0) {
        setSlides(
          data.map((d: any) => ({
            id: d.id,
            image_url: d.image_url,
            alt_text: d.alt_text || '',
          }))
        );
      }
      setLoaded(true);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setActiveIndex((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(activeIndex + 1), [goTo, activeIndex]);
  const prev = useCallback(() => goTo(activeIndex - 1), [goTo, activeIndex]);

  // Auto-rotation; pauses naturally on unmount.
  useEffect(() => {
    if (slides.length <= 1) return;

    timerRef.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % slides.length);
    }, ROTATION_INTERVAL);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [slides.length]);

  // Graceful: nothing to show.
  if (!loaded || slides.length === 0) {
    return null;
  }

  return (
    <section className="featured-gallery bg-ivory py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8">
          <span className="sm block text-gold" style={{ letterSpacing: '0.24em' }}>
            Featured
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-gradient-gold mt-2">
            The Atelier Showcase
          </h2>
        </div>

        <div
          className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden rounded-lg border border-hairline bg-ivory shadow-luxury-card"
          onMouseEnter={() => {
            if (timerRef.current !== null) {
              window.clearInterval(timerRef.current);
              timerRef.current = null;
            }
          }}
          onMouseLeave={() => {
            if (slides.length > 1 && timerRef.current === null) {
              timerRef.current = window.setInterval(() => {
                setActiveIndex((i) => (i + 1) % slides.length);
              }, ROTATION_INTERVAL);
            }
          }}
        >
          {slides.map((slide, index) => (
            <img
              key={slide.id}
              src={slide.image_url}
              alt={slide.alt_text || 'Featured image'}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
              style={{ opacity: index === activeIndex ? 1 : 0 }}
              aria-hidden={index !== activeIndex}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ))}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Previous featured image"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next featured image"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Go to featured image ${index + 1}`}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex
                        ? 'w-6 bg-gold'
                        : 'w-2 bg-white/60 hover:bg-white'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};
