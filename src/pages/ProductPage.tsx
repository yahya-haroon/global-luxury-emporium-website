import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { ProductOption } from '../types';
import { normalizeProductOptions } from '../lib/options';
import { resolvePaymentLink } from '../lib/stripe';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products, settings, loading } = useData();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [personalisationText, setPersonalisationText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setSelectedImage(product.images[0] || '');

      const sizesArray = product.sizes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      setSelectedSize(sizesArray[0] || 'One size');

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
      setErrorMessage(null);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center text-muted font-light">
        Loading jacket details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="font-serif text-3xl text-gradient-gold">
          Product Not Found
        </h2>

        <p className="text-muted">
          The jacket you are looking for does not exist or has been archived.
        </p>

        <Link
          to="/"
          className="btn-gold inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Collection
        </Link>
      </div>
    );
  }

  const sizes = product.sizes
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const productOptions: ProductOption[] = normalizeProductOptions(product.options);

  const showPersonalisation =
    settings.personalisation.enabled &&
    product.allow_personalisation;

  const showRequirements =
    settings.requirements.enabled &&
    product.allow_requirements;

  const updateSelectedOption = (
    name: string,
    value: string
  ) => {
    setSelectedOptions((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage(null);
  };

  const validateOptions = (): boolean => {
    for (const option of productOptions) {
      const val = (selectedOptions[option.name] || '').trim();
      if (option.required && !val) {
        setErrorMessage(
          `Please select or enter ${option.label || option.name}.`
        );
        return false;
      }
    }

    return true;
  };

  const handlePayClick = (
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    setErrorMessage(null);

    if (!validateOptions()) {
      e.preventDefault();
      return;
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

      setErrorMessage(
        result.error ||
          'That option is not available for this jacket right now.'
      );

      return;
    }

    e.currentTarget.href = result.url;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      {/* Back to Collection */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-gold transition-colors mb-8 focus:outline-none focus-visible:text-gold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to collection
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">

        {/* Gallery */}
        <div className="flex flex-col gap-4">

          <div className="aspect-[4/5] bg-ivory rounded overflow-hidden border border-hairline relative">
            <img
              src={selectedImage || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-24 flex-shrink-0 rounded overflow-hidden border transition-all ${
                    selectedImage === img
                      ? 'border-gold ring-2 ring-gold/40'
                      : 'border-hairline hover:border-gold'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">

          <span className="text-xs uppercase tracking-[0.2em] font-medium text-gold-dark mb-2">
            {product.category} Collection
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-text font-medium">
            {product.name}
          </h1>

          <p className="text-2xl sm:text-3xl text-gold font-medium mt-3 mb-6 tracking-wide">
            {settings.currency}
            {product.price.toFixed(2)}
          </p>

          <div className="border-t border-hairline pt-6 mb-6">
            <p className="text-muted text-base font-light leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <label className="block text-xs uppercase tracking-[0.14em] font-medium text-muted mb-2.5">
              Select Size
            </label>

            <div className="flex flex-wrap gap-2.5">
              {sizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setSelectedSize(sz)}
                  className={`filter-chip ${
                    selectedSize === sz ? 'active' : ''
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Product Options */}
          {productOptions.length > 0 && (
            <div className="mb-6 space-y-5">

              {productOptions.map((option) => (
                <div key={option.name}>

                  <label
                    htmlFor={`product-option-${option.name}`}
                    className="block text-xs uppercase tracking-[0.14em] font-medium text-muted mb-2.5"
                  >
                    {option.label || option.name}

                    {option.required && (
                      <span className="text-red-500 ml-1">
                        *
                      </span>
                    )}
                  </label>

                  {/* SELECT */}
                  {option.type === 'select' && (
                    <select
                      id={`product-option-${option.name}`}
                      value={
                        selectedOptions[option.name] || ''
                      }
                      onChange={(e) =>
                        updateSelectedOption(
                          option.name,
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-hairline px-3 py-2.5 text-sm text-text rounded focus:outline-none focus:border-gold"
                    >
                      {!option.required && (
                        <option value="">
                          Select{' '}
                          {option.label || option.name}
                        </option>
                      )}

                      {option.values.map((value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {value}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* RADIO / COLOR */}
                  {(option.type === 'radio' ||
                    option.type === 'color') && (
                    <div className="flex flex-wrap gap-2.5">
                      {option.values.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            updateSelectedOption(
                              option.name,
                              value
                            )
                          }
                          className={`filter-chip ${
                            selectedOptions[option.name] ===
                            value
                              ? 'active'
                              : ''
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* TEXT */}
                  {option.type === 'text' && (
                    <input
                      id={`product-option-${option.name}`}
                      type="text"
                      placeholder={
                        option.placeholder || ''
                      }
                      value={
                        selectedOptions[option.name] || ''
                      }
                      onChange={(e) =>
                        updateSelectedOption(
                          option.name,
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  )}

                  {/* TEXTAREA */}
                  {option.type === 'textarea' && (
                    <textarea
                      id={`product-option-${option.name}`}
                      rows={3}
                      placeholder={
                        option.placeholder || ''
                      }
                      value={
                        selectedOptions[option.name] || ''
                      }
                      onChange={(e) =>
                        updateSelectedOption(
                          option.name,
                          e.target.value
                        )
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Personalisation */}
          {showPersonalisation && (
            <div className="mb-5 p-4 bg-ivory/70 border border-hairline rounded">

              <label
                htmlFor="page-personalisation-input"
                className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1.5"
              >
                {settings.personalisation.label}{' '}
                <span className="text-muted lowercase">
                  (optional)
                </span>
              </label>

              <input
                id="page-personalisation-input"
                type="text"
                maxLength={30}
                placeholder={
                  settings.personalisation.hint
                }
                value={personalisationText}
                onChange={(e) =>
                  setPersonalisationText(e.target.value)
                }
                className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
              />

              <p className="text-[12px] text-muted mt-1.5">
                {settings.personalisation.charge
                  ? `Personalisation adds ${
                      settings.currency
                    }${settings.personalisation.price.toFixed(
                      2
                    )}.`
                  : 'Personalisation is free.'}
              </p>
            </div>
          )}

          {/* Additional Requirements */}
          {showRequirements && (
            <div className="mb-6 p-4 bg-ivory/70 border border-hairline rounded">

              <label
                htmlFor="page-requirements-input"
                className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1.5"
              >
                {settings.requirements.label}{' '}
                <span className="text-muted lowercase">
                  (optional)
                </span>
              </label>

              <textarea
                id="page-requirements-input"
                rows={3}
                maxLength={110}
                placeholder={
                  settings.requirements.hint
                }
                value={requirementsText}
                onChange={(e) =>
                  setRequirementsText(e.target.value)
                }
                className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
              />

              <p className="text-[12px] text-muted mt-1.5">
                {settings.requirements.charge
                  ? `Additional requirements add ${
                      settings.currency
                    }${settings.requirements.price.toFixed(
                      2
                    )}.`
                  : 'No extra charge for this.'}
              </p>
            </div>
          )}

          {/* Error */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Payment */}
          <div>
            {product.link &&
            product.link.trim() !== '' ? (
              <div>
                <a
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handlePayClick}
                  className="btn"
                >
                  Pay by card
                </a>

                <p className="text-center text-xs text-muted mt-2.5 font-light">
                  Direct card checkout powered by
                  Stripe. Delivery address captured upon
                  payment.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-ivory text-center border border-hairline rounded text-sm text-muted">
                Card payment is not available for this
                jacket yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};