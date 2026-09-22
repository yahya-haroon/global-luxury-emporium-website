import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Product, Settings } from '../types';
import { resolvePaymentLink } from '../lib/stripe';

interface ProductModalProps {
  product: Product | null;
  settings: Settings;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, settings, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [personalisationText, setPersonalisationText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0] || '');
      const sizesArray = product.sizes.split(',').map((s) => s.trim());
      setSelectedSize(sizesArray[0] || 'One size');
      setPersonalisationText('');
      setRequirementsText('');
      setErrorMessage(null);
    }
  }, [product]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const sizes = product.sizes.split(',').map((s) => s.trim());
  const showPersonalisation = settings.personalisation.enabled && product.allow_personalisation;
  const showRequirements = settings.requirements.enabled && product.allow_requirements;

  /**
   * Requirement 4:
   * Make the "Pay by card" button an <a target="_blank" rel="noopener"> whose href is set on click.
   */
  const handlePayClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setErrorMessage(null);

    const result = resolvePaymentLink(
      product,
      settings,
      selectedSize,
      personalisationText,
      requirementsText
    );

    if (!result.isAvailable || !result.url) {
      e.preventDefault();
      setErrorMessage(result.error || 'That option is not available for this jacket right now.');
      return;
    }

    // Assign href dynamically on click
    e.currentTarget.href = result.url;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-product-title"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-hairline rounded shadow-2xl p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-muted hover:text-text hover:bg-ivory rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Gallery Column */}
          <div className="flex flex-col gap-3">
            <div className="aspect-[4/5] bg-ivory rounded overflow-hidden border border-hairline relative">
              <img
                src={selectedImage || product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-20 flex-shrink-0 rounded overflow-hidden border transition-all ${
                      selectedImage === img
                        ? 'border-gold ring-2 ring-gold/40'
                        : 'border-hairline hover:border-gold'
                    }`}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details Column */}
          <div className="flex flex-col">
            <h2 id="modal-product-title" className="font-serif text-3xl sm:text-4xl text-text font-normal">
              {product.name}
            </h2>

            <p className="text-2xl text-gold font-medium mt-2 mb-4 tracking-wide">
              {settings.currency}{product.price.toFixed(2)}
            </p>

            <div className="border-t border-hairline pt-4 mb-5">
              <p className="text-muted text-sm sm:text-base font-light leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Size Selector */}
            <div className="mb-5">
              <label className="block text-xs uppercase tracking-[0.14em] font-medium text-muted mb-2">
                Select Size
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setSelectedSize(sz)}
                    className={`filter-chip ${selectedSize === sz ? 'active' : ''}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Personalisation Box */}
            {showPersonalisation && (
              <div className="mb-5 p-3.5 bg-ivory/60 border border-hairline rounded">
                <label
                  htmlFor="personalisation-input"
                  className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1"
                >
                  {settings.personalisation.label} <span className="text-muted lowercase">(optional)</span>
                </label>
                <input
                  id="personalisation-input"
                  type="text"
                  maxLength={30}
                  placeholder={settings.personalisation.hint}
                  value={personalisationText}
                  onChange={(e) => setPersonalisationText(e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
                <p className="text-[12px] text-muted mt-1">
                  {settings.personalisation.charge
                    ? `Personalisation adds ${settings.currency}${settings.personalisation.price.toFixed(2)}.`
                    : 'Personalisation is free.'}
                </p>
              </div>
            )}

            {/* Optional Requirements Box */}
            {showRequirements && (
              <div className="mb-5 p-3.5 bg-ivory/60 border border-hairline rounded">
                <label
                  htmlFor="requirements-input"
                  className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1"
                >
                  {settings.requirements.label} <span className="text-muted lowercase">(optional)</span>
                </label>
                <textarea
                  id="requirements-input"
                  rows={2}
                  maxLength={110}
                  placeholder={settings.requirements.hint}
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
                />
                <p className="text-[12px] text-muted mt-1">
                  {settings.requirements.charge
                    ? `Additional requirements add ${settings.currency}${settings.requirements.price.toFixed(2)}.`
                    : 'No extra charge for this.'}
                </p>
              </div>
            )}

            {/* Error Message if Link Unavailable */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Order Action Button */}
            <div className="mt-2">
              {product.link && product.link.trim() !== '' ? (
                <div>
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handlePayClick}
                    className="btn-gold w-full text-center"
                  >
                    Pay by card
                  </a>
                  <p className="text-center text-xs text-muted mt-2 font-light">
                    Secure card payment via Stripe. You will enter delivery details on checkout.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-ivory text-center border border-hairline rounded text-sm text-muted">
                  Card payment is not available for this jacket yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
