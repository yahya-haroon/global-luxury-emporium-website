import React from 'react';
import { Star } from 'lucide-react';

interface ProductCardRatingProps {
  rating: number;
  count: number;
  theme?: 'light' | 'dark';
  size?: number;
  className?: string;
}

/**
 * Editorial star rating display for product cards.
 *
 * Displays:
 *   ★★★★★ 4.8 (12)
 * directly underneath product name/price.
 *
 * Features:
 * - Shows visual stars including fractional/decimal fills.
 * - Displays average rating rounded to 1 decimal place.
 * - Displays total published reviews in parentheses.
 * - Renders nothing if count <= 0 (no fake ratings).
 * - Adapts to light (ivory) and dark themes.
 */
export const ProductCardRating: React.FC<ProductCardRatingProps> = ({
  rating,
  count,
  theme = 'light',
  size = 12,
  className = '',
}) => {
  if (count <= 0 || rating <= 0) {
    return null;
  }

  const roundedRating = Math.round(rating * 10) / 10;
  const formattedRating = roundedRating.toFixed(1);

  const isDark = theme === 'dark';
  const starUnfilledColor = isDark ? 'rgba(255, 255, 255, 0.28)' : 'rgba(20, 18, 16, 0.25)';
  const scoreColor = isDark ? '#FFFFFF' : 'var(--ink, #141210)';
  const countColor = isDark ? 'rgba(255, 255, 255, 0.65)' : 'var(--mu, #757065)';

  return (
    <div
      className={`product-card-rating ${className}`}
      aria-label={`Rated ${formattedRating} out of 5 stars from ${count} ${count === 1 ? 'review' : 'reviews'}`}
    >
      <div className="rating-stars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          // Fraction of this specific star that should be filled (0 to 1)
          const fill = Math.max(0, Math.min(1, roundedRating - (starIndex - 1)));
          const fillPercent = Math.round(fill * 100);

          return (
            <span
              key={starIndex}
              className="rating-star-wrap"
              style={{ width: size, height: size }}
            >
              {/* Unfilled base star */}
              <Star
                style={{ width: size, height: size, color: starUnfilledColor }}
                className="stroke-[1.5] fill-transparent shrink-0"
              />
              {/* Gold filled overlay, clipped by fill percentage */}
              {fillPercent > 0 && (
                <span
                  className="rating-star-fill"
                  style={{ width: `${fillPercent}%` }}
                >
                  <Star
                    style={{ width: size, height: size, minWidth: size, minHeight: size }}
                    className="text-gold fill-gold stroke-[1.5] shrink-0"
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="rating-score" style={{ color: scoreColor }}>
        {formattedRating}
      </span>
      <span className="rating-count" style={{ color: countColor }}>
        ({count})
      </span>
    </div>
  );
};
