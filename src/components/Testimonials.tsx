import React, { useEffect, useState } from 'react';
import { Star, BadgeCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { Review } from '../types';

/**
 * Public social-proof band: shows only PUBLISHED reviews (public RLS read).
 * Renders nothing when there are no reviews yet — never invents testimonials.
 */
export const Testimonials: React.FC = () => {
  const { products } = useData();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isSupabaseConfigured) return;

      const { data, error } = await supabase
        .from('reviews')
        .select(
          'id, product_id, order_id, customer_name, rating, review, verified, published, created_at, updated_at'
        )
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (!cancelled && !error && Array.isArray(data)) {
        setReviews(data as Review[]);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (reviews.length === 0) return null;

  const productName = (productId: string): string =>
    products.find((p) => p.id === productId)?.name || 'Global Luxury Emporium';

  return (
    <section className="testi">
      <div className="testi-head">
        <div className="sm" style={{ color: 'var(--au)' }}>
          Customer reviews
        </div>
        <h2 className="testi-title">What Our Customers Say</h2>
      </div>

      <div className="testi-grid">
        {reviews.map((review) => (
          <article key={review.id} className="testi-card">
            <div
              className="testi-stars"
              role="img"
              aria-label={`Rated ${review.rating} out of 5 stars`}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  aria-hidden="true"
                  className={`w-3.5 h-3.5 ${n <= review.rating ? 'fill-gold text-gold' : 'text-hairline'}`}
                />
              ))}
            </div>

            <p className="testi-text">&ldquo;{review.review}&rdquo;</p>

            <div className="testi-meta">
              <span className="testi-name">{review.customer_name || 'Customer'}</span>
              <span className="testi-product sm">{productName(review.product_id)}</span>
              {review.verified && (
                <span className="testi-verified sm">
                  <BadgeCheck className="w-3 h-3" /> Verified Purchase
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
