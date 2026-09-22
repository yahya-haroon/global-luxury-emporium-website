import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Product, Settings, ProductOption } from '../types';
import { normalizeProductOptions } from '../lib/options';
import { resolvePaymentLink } from '../lib/stripe';

interface ProductDrawerProps {
  product: Product | null;
  settings: Settings;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductDrawer: React.FC<ProductDrawerProps> = ({
  product,
  settings,
  isOpen,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [personalisationText, setPersonalisationText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0] || '');
      const sizesArray = product.sizes.split(',').map((s) => s.trim());
      setSelectedSize(sizesArray[0] || 'One size');
      setPersonalisationText('');
      setRequirementsText('');
      setToastMessage(null);

      const optionsList = normalizeProductOptions(product.options);
      const initialOptions: Record<string, string> = {};
      optionsList.forEach((option) => {
        if (
          option.type === 'select' ||
          option.type === 'radio' ||
          option.type === 'color'
        ) {
          if (option.values && option.values.length > 0) {
            initialOptions[option.name] = option.values[0];
          }
        } else {
          initialOptions[option.name] = '';
        }
      });
      setSelectedOptions(initialOptions);
    }
  }, [product]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  if (!product) return null;

  const sizes = product.sizes.split(',').map((s) => s.trim());
  const productOptions: ProductOption[] = normalizeProductOptions(product.options);

  const handlePayClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    for (const option of productOptions) {
      const val = (selectedOptions[option.name] || '').trim();
      if (option.required && !val) {
        e.preventDefault();
        showToast(`Please select or enter ${option.label || option.name}.`);
        return;
      }
    }

    const result = resolvePaymentLink(
      product,
      settings,
      selectedSize,
      personalisationText,
      requirementsText,
      selectedOptions
    );

    if (!result.isAvailable || !result.url) {
      e.preventDefault();
      showToast(result.error || 'Preview only. Payment links are added by the owner.');
      return;
    }

    // Set dynamic href on click
    e.currentTarget.href = result.url;
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`ov ${isOpen ? 'o' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />

      {/* Slide-over panel */}
      <aside
        className={`pn ${isOpen ? 'o' : ''}`}
        aria-label="Product details"
        aria-hidden={!isOpen}
      >
        <button className="x sm" onClick={onClose} aria-label="Close product drawer">
          Close
        </button>

        <h2 style={{ fontSize: '40px', marginTop: '8px', lineHeight: 1.1 }}>{product.name}</h2>
        <p style={{ margin: '8px 0 0', color: 'var(--au)', fontSize: '18px', fontWeight: 500 }}>
          {settings.currency}{product.price.toFixed(2)}
        </p>

        <img
          className="mi"
          id="mi"
          src={selectedImage || product.images[0]}
          alt={product.name}
        />

        {/* Thumbnail gallery */}
        {product.images.length > 1 && (
          <div className="th">
            {product.images.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt=""
                className={selectedImage === img ? 'on' : ''}
                onClick={() => setSelectedImage(img)}
              />
            ))}
          </div>
        )}

        <p style={{ color: 'var(--mu)', marginTop: '16px', lineHeight: 1.6 }}>
          {product.description}
        </p>

        {/* Size Selection */}
        <div className="sm" style={{ marginTop: '24px' }}>
          Size
        </div>
        <div className="sz">
          {sizes.map((sz) => (
            <button
              key={sz}
              type="button"
              className={selectedSize === sz ? 'on' : ''}
              onClick={() => setSelectedSize(sz)}
            >
              {sz}
            </button>
          ))}
        </div>

        {/* Dynamic Product Options */}
        {productOptions.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {productOptions.map((option) => (
              <div key={option.name} style={{ marginTop: '18px' }}>
                <div className="sm" style={{ marginBottom: '8px' }}>
                  {option.label || option.name}
                  {option.required && (
                    <span style={{ color: '#e53e3e', marginLeft: '4px' }}>*</span>
                  )}
                </div>

                {/* SELECT */}
                {option.type === 'select' && (
                  <select
                    value={selectedOptions[option.name] || ''}
                    onChange={(e) =>
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [option.name]: e.target.value,
                      }))
                    }
                    style={{
                      width: '100%',
                      background: '#fff',
                      border: '1px solid var(--ln)',
                      padding: '10px 12px',
                      fontSize: '14px',
                      color: 'var(--ink)',
                      borderRadius: '2px',
                      outline: 'none',
                    }}
                  >
                    {(!option.required || !selectedOptions[option.name]) && (
                      <option value="">Select {option.label || option.name}</option>
                    )}
                    {option.values.map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                )}

                {/* RADIO / COLOR */}
                {(option.type === 'radio' || option.type === 'color') && (
                  <div className="sz" style={{ margin: '8px 0 0' }}>
                    {option.values.map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={selectedOptions[option.name] === val ? 'on' : ''}
                        onClick={() =>
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [option.name]: val,
                          }))
                        }
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}

                {/* TEXT */}
                {option.type === 'text' && (
                  <input
                    type="text"
                    placeholder={option.placeholder || `Enter ${option.label || option.name}`}
                    value={selectedOptions[option.name] || ''}
                    onChange={(e) =>
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [option.name]: e.target.value,
                      }))
                    }
                  />
                )}

                {/* TEXTAREA */}
                {option.type === 'textarea' && (
                  <textarea
                    rows={2}
                    placeholder={option.placeholder || `Enter ${option.label || option.name}`}
                    value={selectedOptions[option.name] || ''}
                    onChange={(e) =>
                      setSelectedOptions((prev) => ({
                        ...prev,
                        [option.name]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Personalisation (optional) */}
        {product.allow_personalisation && (
          <>
            <label className="field-lbl">
              Personalisation (optional)
              {settings.personalisation.charge && settings.personalisation.price > 0 && (
                <span style={{ color: 'var(--au)', marginLeft: '6px' }}>
                  (+{settings.currency}{settings.personalisation.price.toFixed(2)})
                </span>
              )}
            </label>
            <input
              type="text"
              maxLength={30}
              placeholder="Name or initials"
              value={personalisationText}
              onChange={(e) => setPersonalisationText(e.target.value)}
            />
          </>
        )}

        {/* Additional requirements (optional) */}
        {product.allow_requirements && (
          <>
            <label className="field-lbl">
              Additional requirements (optional)
              {settings.requirements.charge && settings.requirements.price > 0 && (
                <span style={{ color: 'var(--au)', marginLeft: '6px' }}>
                  (+{settings.currency}{settings.requirements.price.toFixed(2)})
                </span>
              )}
            </label>
            <textarea
              rows={2}
              maxLength={110}
              placeholder="For example: sleeve length"
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
            />
          </>
        )}

        <div style={{ marginTop: '32px' }}>
          <a
            className="btn"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handlePayClick}
          >
            Pay by card
          </a>
        </div>

        {/* Link to dedicated product page */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Link
            to={`/product/${product.id}`}
            onClick={onClose}
            className="sm"
            style={{
              color: 'var(--au)',
              display: 'inline-block',
              padding: '8px 0',
              letterSpacing: '0.18em',
            }}
          >
            View dedicated product page &rarr;
          </Link>
        </div>
      </aside>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div id="t" role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
};
