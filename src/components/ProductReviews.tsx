import React, { useEffect, useState, useCallback } from 'react';
import { Star, BadgeCheck, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Review } from '../types';
import {
  fetchProductReviews,
  checkReviewEligibility,
  submitReview,
  updateReview,
} from '../lib/reviews';

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

type FlowStage =
  | 'idle'
  | 'verify'        // asking for order email + reference
  | 'write'         // new review form
  | 'edit'          // editing existing review
  | 'message';      // showing an explanation / error

const StarRating: React.FC<{
  value: number;
  onChange?: (n: number) => void;
  size?: number;
  readOnly?: boolean;
}> = ({ value, onChange, size = 18, readOnly }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={filled ? 'text-gold fill-gold' : 'text-hairline'}
          />
        );
        return readOnly || !onChange ? (
          <React.Fragment key={n}>{star}</React.Fragment>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Rate ${n} out of 5`}
            className="p-0.5 focus:outline-none"
          >
            {star}
          </button>
        );
      })}
    </div>
  );
};

export const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [stage, setStage] = useState<FlowStage>('idle');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'error' | 'info' | 'success'; text: string } | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    const data = await fetchProductReviews(productId);
    setReviews(data);
    setLoading(false);
  }, [productId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const resetFlow = () => {
    setStage('idle');
    setNotice(null);
    setRating(5);
    setText('');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNotice({ kind: 'error', text: 'Please enter the email address used on your order.' });
      return;
    }
    if (!orderId.trim()) {
      setNotice({ kind: 'error', text: 'Please enter your order reference.' });
      return;
    }

    setBusy(true);
    try {
      const result = await checkReviewEligibility(productId, orderId.trim(), email.trim());

      if (!result.eligible) {
        let message = 'We could not verify a qualifying order for this product.';
        if (result.reason === 'not_delivered') {
          message =
            'Your order has not been delivered yet. Reviews become available once your order is marked Delivered.';
        } else if (result.reason === 'order_cancelled') {
          message = 'This order was cancelled, so it is not eligible for reviews.';
        } else if (result.reason === 'product_mismatch') {
          message = 'That order does not contain this product, so it cannot be reviewed here.';
        } else if (result.reason === 'order_not_found') {
          message = 'We could not find an order matching that reference and email.';
        }
        setStage('message');
        setNotice({ kind: 'info', text: message });
        return;
      }

      // Eligible.
      if (result.hasReview && result.existingReview) {
        setRating(result.existingReview.rating);
        setText(result.existingReview.review);
        setStage('edit');
      } else {
        setRating(5);
        setText('');
        setStage('write');
      }
    } catch (err: any) {
      setStage('message');
      setNotice({ kind: 'error', text: err.message || 'Verification failed. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    if (text.trim().length < 1) {
      setNotice({ kind: 'error', text: 'Please write your review before submitting.' });
      return;
    }

    setBusy(true);
    const res =
      stage === 'edit'
        ? await updateReview(productId, orderId.trim(), email.trim(), rating, text.trim())
        : await submitReview(productId, orderId.trim(), email.trim(), rating, text.trim());
    setBusy(false);

    if ('error' in res) {
      setStage('message');
      setNotice({ kind: 'error', text: res.error });
      return;
    }

    await loadReviews();
    resetFlow();
    setOrderId('');
    setEmail('');
    setNotice({
      kind: 'success',
      text: stage === 'edit' ? 'Your review has been updated.' : 'Thank you! Your verified review has been published.',
    });
  };

  return (
    <section className="mt-16 border-t border-hairline pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <span className="sm block text-gold" style={{ letterSpacing: '0.24em' }}>
            Client Feedback
          </span>
          <h2 className="font-serif text-3xl text-text font-medium mt-2">
            Reviews for {productName}
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <StarRating value={Math.round(averageRating)} readOnly size={16} />
              <span className="text-sm text-muted">
                {averageRating.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {stage === 'idle' && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setStage('verify');
            }}
            className="btn-gold text-xs py-2.5 px-5"
          >
            Write a review
          </button>
        )}
      </div>

      {/* Notice banner */}
      {notice && stage !== 'verify' && stage !== 'write' && stage !== 'edit' && (
        <div
          className={`mb-6 p-3.5 rounded text-xs flex items-start gap-2 border ${
            notice.kind === 'error'
              ? 'bg-red-50 border-red-200 text-red-700'
              : notice.kind === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-ivory border-hairline text-muted'
          }`}
        >
          {notice.kind === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : notice.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5 text-gold" />
          )}
          <span className="flex-1">{notice.text}</span>
          {stage === 'message' && (
            <button type="button" onClick={resetFlow} className="text-gold hover:underline">
              Back
            </button>
          )}
        </div>
      )}

      {/* Verification / write / edit panel */}
      {(stage === 'verify' || stage === 'write' || stage === 'edit') && (
        <div className="mb-10 bg-white border border-hairline rounded-lg p-5 sm:p-6 shadow-sm max-w-2xl">
          {stage === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <h3 className="font-serif text-xl text-text font-medium">Verify your purchase</h3>
                <p className="text-xs text-muted font-light mt-1 leading-relaxed">
                  To keep reviews genuine, only customers with a delivered order for this exact
                  product can review it. Enter the email and order reference from your purchase —
                  we verify it securely against your order before publishing.
                </p>
              </div>

              {notice?.kind === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{notice.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="review-email" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                    Order email
                  </label>
                  <input
                    id="review-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label htmlFor="review-order" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                    Order reference
                  </label>
                  <input
                    id="review-order"
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="From your confirmation"
                    className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={busy} className="btn-gold text-xs py-2.5 px-5 flex items-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Verify order
                </button>
                <button type="button" onClick={resetFlow} className="btn-ghost text-xs py-2.5 px-4">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {(stage === 'write' || stage === 'edit') && (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl text-text font-medium">
                  {stage === 'edit' ? 'Edit your review' : 'Write your review'}
                </h3>
                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-medium">
                  <BadgeCheck className="w-3 h-3" /> Verified Purchase
                </span>
              </div>

              {notice?.kind === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{notice.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Your rating
                </label>
                <StarRating value={rating} onChange={setRating} size={26} />
              </div>

              <div>
                <label htmlFor="review-text" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Your review
                </label>
                <textarea
                  id="review-text"
                  rows={4}
                  maxLength={3000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Share your experience with this piece..."
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <p className="text-[11px] text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                The Verified Purchase badge is granted automatically from your delivered order and cannot be added manually.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={busy} className="btn-gold text-xs py-2.5 px-5 flex items-center gap-2">
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  {stage === 'edit' ? 'Update review' : 'Publish review'}
                </button>
                <button type="button" onClick={resetFlow} className="btn-ghost text-xs py-2.5 px-4">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-gold mr-2" />
          Loading reviews...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-hairline rounded-lg">
          <p className="text-muted text-sm font-light">
            No reviews yet. Verified customers with a delivered order can be the first to review this piece.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-hairline rounded-lg p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <StarRating value={review.rating} readOnly size={15} />
                {review.verified && (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300 px-2 py-0.5 rounded-full font-medium">
                    <BadgeCheck className="w-3 h-3" /> Verified Purchase
                  </span>
                )}
              </div>
              <p className="text-sm text-text font-light leading-relaxed whitespace-pre-wrap">
                {review.review}
              </p>
              <p className="text-xs text-muted mt-3">
                {review.customer_name || 'Verified Customer'} ·{' '}
                {new Date(review.created_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
