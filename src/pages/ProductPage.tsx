import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { normalizeProductOptions } from '../lib/options';
import { ProductReviews } from '../components/ProductReviews';
import { SEO } from '../components/SEO';
import { useCart } from '../context/CartContext';
import { ClarityAnalytics } from '../lib/clarity';
import { getProductSaleInfo } from '../lib/sales';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Sparkles,
} from 'lucide-react';

export const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products, settings, loading, reviews, sales } = useData();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const product = products.find((p) => p.id === id);
  const saleInfo = product ? getProductSaleInfo(product, sales) : null;

  const productReviews = (reviews || []).filter((r) => r.product_id === product?.id && r.published);
  const averageRating =
    productReviews.length > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : 5;

  const siteUrl = 'https://www.globalluxuryemporium.com';
  const productUrl = product ? `${siteUrl}/product/${product.id}` : siteUrl;
  const productImage = product?.images?.[0]
    ? product.images[0].startsWith('http')
      ? product.images[0]
      : `${siteUrl}${product.images[0].startsWith('/') ? product.images[0] : `/${product.images[0]}`}`
    : `${siteUrl}/assets/banner.png`;

  const description = product?.description?.trim()
    ? product.description.trim().replace(/\s+/g, ' ').slice(0, 160)
    : product
      ? `Shop the ${product.name} from Global Luxury Emporium. Premium handcrafted leather fashion designed in London and master-crafted in our dedicated atelier.`
      : '';

  const currencyMap: Record<string, string> = {
    '£': 'GBP',
    $: 'USD',
    '€': 'EUR',
    GBP: 'GBP',
    USD: 'USD',
    EUR: 'EUR',
    CAD: 'CAD',
    AUD: 'AUD',
  };

  const priceCurrency =
    currencyMap[settings.currency] ||
    currencyMap[settings.currency?.toUpperCase?.()] ||
    'GBP';

  const productStructuredData = product
    ? {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description,
        image: product.images?.length
          ? product.images.map((img) =>
              img.startsWith('http') ? img : `${siteUrl}${img.startsWith('/') ? img : `/${img}`}`
            )
          : [productImage],
        sku: product.id,
        mpn: product.id,
        brand: {
          '@type': 'Brand',
          name: 'Global Luxury Emporium',
        },
        manufacturer: {
          '@type': 'Organization',
          name: 'Global Luxury Emporium Ltd',
        },
        category: product.category,
        offers: {
          '@type': 'Offer',
          url: productUrl,
          priceCurrency,
          price: Number(saleInfo?.hasSale ? saleInfo.salePrice : product.price).toFixed(2),
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'Global Luxury Emporium',
          },
          hasMerchantReturnPolicy: {
            '@type': 'MerchantReturnPolicy',
            applicableCountry: 'GB',
            returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
            merchantReturnDays: 14,
            returnMethod: 'https://schema.org/ReturnByMail',
            returnFees: 'https://schema.org/FreeReturn',
          },
        },
        ...(productReviews.length > 0
          ? {
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: averageRating.toFixed(1),
                reviewCount: productReviews.length,
                bestRating: '5',
                worstRating: '1',
              },
              review: productReviews.slice(0, 5).map((r) => ({
                '@type': 'Review',
                author: {
                  '@type': 'Person',
                  name: r.customer_name || 'Verified Customer',
                },
                datePublished: r.created_at ? r.created_at.split('T')[0] : '2026-09-01',
                reviewBody: r.review,
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: r.rating,
                  bestRating: '5',
                  worstRating: '1',
                },
              })),
            }
          : {}),
      }
    : undefined;

  const breadcrumbs = product
    ? [
        { name: 'Home', item: '/' },
        { name: product.category || 'Collection', item: `/?category=${encodeURIComponent(product.category || 'All')}` },
        { name: product.name, item: `/product/${product.id}` },
      ]
    : undefined;

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [personalisationText, setPersonalisationText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedToCartToast, setAddedToCartToast] = useState(false);

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
        }
      });

      setSelectedOptions(initialOptions);
      setPersonalisationText('');
      setRequirementsText('');
      setErrorMessage(null);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <h1 className="font-serif text-3xl text-text font-medium mb-4">Piece not found</h1>
        <p className="text-muted text-sm mb-8 font-light">
          The requested luxury piece is unavailable or may have been retired from the collection.
        </p>
        <Link to="/" className="btn inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Return to collection
        </Link>
      </div>
    );
  }

  const productPrice = Number(saleInfo?.hasSale ? saleInfo.salePrice : product.price);
  const originalPrice = Number(product.price);

  const personalisationFee =
    personalisationText.trim() && settings.personalisation.charge
      ? Number(settings.personalisation.price || 0)
      : 0;

  const requirementsFee =
    requirementsText.trim() && settings.requirements.charge
      ? Number(settings.requirements.price || 0)
      : 0;

  const productOptions = normalizeProductOptions(product.options);

  const handleOptionChange = (name: string, value: string) => {
    setSelectedOptions((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage(null);
  };

  const validateProductSelections = (): boolean => {
    for (const option of productOptions) {
      const val = (selectedOptions[option.name] || '').trim();
      if (option.required && !val) {
        setErrorMessage(`Please select or enter ${option.label || option.name}.`);
        return false;
      }
    }

    if (!selectedSize) {
      setErrorMessage('Please select a jacket size.');
      return false;
    }

    return true;
  };

  const handleAddToBag = () => {
    setErrorMessage(null);
    if (!validateProductSelections()) return;

    addItem({
      productId: product.id,
      productName: product.name,
      price: productPrice,
      originalPrice: product.price,
      discountPercentage: saleInfo?.hasSale ? saleInfo.discountPercentage : undefined,
      saleName: saleInfo?.hasSale ? saleInfo.saleName : undefined,
      image: selectedImage || product.images[0] || '/assets/products/shearling-aviator-jacket-main.png',
      size: selectedSize,
      selectedOptions,
      personalisationText: personalisationText.trim(),
      personalisationFee,
      requirementsText: requirementsText.trim(),
      requirementsFee,
      quantity: 1,
    });

    setAddedToCartToast(true);
    setTimeout(() => setAddedToCartToast(false), 2500);
  };

  const handleBuyNow = () => {
    setErrorMessage(null);
    if (!validateProductSelections()) return;

    addItem({
      productId: product.id,
      productName: product.name,
      price: productPrice,
      originalPrice: product.price,
      discountPercentage: saleInfo?.hasSale ? saleInfo.discountPercentage : undefined,
      saleName: saleInfo?.hasSale ? saleInfo.saleName : undefined,
      image: selectedImage || product.images[0] || '/assets/products/shearling-aviator-jacket-main.png',
      size: selectedSize,
      selectedOptions,
      personalisationText: personalisationText.trim(),
      personalisationFee,
      requirementsText: requirementsText.trim(),
      requirementsFee,
      quantity: 1,
    });

    ClarityAnalytics.checkoutStarted({
      productId: product.id,
      totalAmount: productPrice + personalisationFee + requirementsFee,
      itemCount: 1,
    });

    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
      <SEO
        title={`${product.name} | Global Luxury Emporium`}
        description={description}
        canonical={`/product/${product.id}`}
        ogType="product"
        image={productImage}
        structuredData={productStructuredData}
        breadcrumbs={breadcrumbs}
      />

      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted hover:text-gold transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to collection
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="w-full aspect-[4/5] bg-ivory rounded-lg overflow-hidden border border-hairline shadow-luxury-card relative group">
            <img
              src={selectedImage || product.images[0] || '/assets/products/shearling-aviator-jacket-main.png'}
              alt={product.name}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            {saleInfo?.hasSale && (
              <span className="product-sale-badge sm absolute top-4 left-4 z-10">
                {saleInfo.discountPercentage}% OFF
              </span>
            )}
          </div>

          {/* Thumbnails row */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-24 flex-shrink-0 rounded overflow-hidden border transition-all ${
                    (selectedImage || product.images[0]) === img
                      ? 'border-gold ring-2 ring-gold/40'
                      : 'border-hairline hover:border-gold'
                  }`}
                  aria-label={`View photo ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information, Options, and Actions */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          <div>
            <span className="sm text-gold block mb-1 uppercase tracking-[0.24em] text-xs font-medium">
              {product.category} Collection
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium leading-tight">
              {product.name}
            </h1>

            {/* Pricing Section with Active Sale Highlight */}
            <div className="mt-3 mb-4">
              {saleInfo?.hasSale ? (
                <div className="space-y-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="text-3xl text-red-600 font-semibold tracking-wide">
                      {settings.currency}
                      {saleInfo.salePrice.toFixed(2)}
                    </span>
                    <span className="text-lg text-muted/70 line-through font-light">
                      {settings.currency}
                      {originalPrice.toFixed(2)}
                    </span>
                    <span className="bg-red-50 text-red-700 border border-red-200 text-xs px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider">
                      Save {settings.currency}{saleInfo.savings.toFixed(2)} ({saleInfo.discountPercentage}%)
                    </span>
                  </div>
                  {saleInfo.saleName && (
                    <div className="text-[11px] text-red-700/80 font-medium flex items-center gap-1.5 pt-0.5">
                      <Sparkles className="w-3 h-3 text-red-500" />
                      <span>Applied promotion: <strong>{saleInfo.saleName}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-2xl sm:text-3xl text-gold font-medium tracking-wide">
                  {settings.currency}
                  {product.price.toFixed(2)}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="text-muted font-light text-sm leading-relaxed border-t border-hairline pt-4 space-y-2 whitespace-pre-line">
              {product.description}
            </div>
          </div>

          {/* Size Selection */}
          <div className="border-t border-hairline pt-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <label className="text-xs uppercase tracking-wider font-semibold text-text">
                Select Size <span className="text-red-500">*</span>
              </label>
              <a href="#guide" className="text-xs text-gold hover:underline font-light">
                Size Guide
              </a>
            </div>

            <div className="flex flex-wrap gap-2">
              {product.sizes
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((size) => {
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setErrorMessage(null);
                      }}
                      className={`min-w-[44px] h-10 px-3 text-xs uppercase font-medium rounded border transition-all ${
                        isSelected
                          ? 'border-gold bg-gold text-black shadow-sm'
                          : 'border-hairline bg-white hover:border-gold text-text'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Dynamic Product Options */}
          {productOptions.length > 0 && (
            <div className="border-t border-hairline pt-4 space-y-4">
              {productOptions.map((option) => (
                <div key={option.name} className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider font-semibold text-text">
                    {option.label || option.name}{' '}
                    {option.required && <span className="text-red-500">*</span>}
                  </label>

                  {/* Color Option */}
                  {option.type === 'color' && (
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((val) => {
                        const isSelected = selectedOptions[option.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleOptionChange(option.name, val)}
                            className={`px-3 py-1.5 text-xs rounded border transition-all ${
                              isSelected
                                ? 'border-gold bg-gold/10 text-gold-dark font-medium shadow-sm'
                                : 'border-hairline bg-white hover:border-gold text-text'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Radio Option */}
                  {option.type === 'radio' && (
                    <div className="flex flex-wrap gap-2">
                      {option.values.map((val) => {
                        const isSelected = selectedOptions[option.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleOptionChange(option.name, val)}
                            className={`px-3 py-1.5 text-xs rounded border transition-all ${
                              isSelected
                                ? 'border-gold bg-gold text-black font-semibold'
                                : 'border-hairline bg-white hover:border-gold text-text'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Select Option */}
                  {option.type === 'select' && (
                    <select
                      value={selectedOptions[option.name] || ''}
                      onChange={(e) => handleOptionChange(option.name, e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-xs rounded focus:outline-none focus:border-gold text-text"
                    >
                      <option value="">Choose {option.label || option.name}...</option>
                      {option.values.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Text Input */}
                  {option.type === 'text' && (
                    <input
                      type="text"
                      placeholder={option.placeholder || `Enter ${option.name}...`}
                      value={selectedOptions[option.name] || ''}
                      onChange={(e) => handleOptionChange(option.name, e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-xs rounded focus:outline-none focus:border-gold text-text"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Personalisation (Optional) */}
          {product.allow_personalisation && settings.personalisation?.enabled && (
            <div className="border-t border-hairline pt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="uppercase tracking-wider font-semibold text-text">
                  {settings.personalisation.label}
                </label>
                {settings.personalisation.charge && settings.personalisation.price > 0 && (
                  <span className="text-gold font-medium">
                    +{settings.currency}{settings.personalisation.price.toFixed(2)}
                  </span>
                )}
              </div>
              <input
                type="text"
                maxLength={30}
                placeholder={settings.personalisation.hint || 'Name or initials (up to 30 characters)'}
                value={personalisationText}
                onChange={(e) => setPersonalisationText(e.target.value)}
                className="w-full bg-white border border-hairline px-3 py-2 text-xs rounded focus:outline-none focus:border-gold text-text"
              />
            </div>
          )}

          {/* Additional Requirements (Optional) */}
          {product.allow_requirements && settings.requirements?.enabled && (
            <div className="border-t border-hairline pt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="uppercase tracking-wider font-semibold text-text">
                  {settings.requirements.label}
                </label>
                {settings.requirements.charge && settings.requirements.price > 0 && (
                  <span className="text-gold font-medium">
                    +{settings.currency}{settings.requirements.price.toFixed(2)}
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                maxLength={110}
                placeholder={settings.requirements.hint || 'Custom notes or sizing instructions...'}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                className="w-full bg-white border border-hairline px-3 py-2 text-xs rounded focus:outline-none focus:border-gold text-text"
              />
            </div>
          )}

          {/* ACTION BUTTONS: BUY NOW & ADD TO BAG */}
          <div className="border-t border-hairline pt-6 space-y-3">
            {/* Primary: Buy Now (Redirects to /checkout) */}
            <button
              type="button"
              onClick={handleBuyNow}
              className="btn-gold w-full py-4 flex items-center justify-center gap-2 text-sm uppercase tracking-wider font-semibold shadow-md active:scale-[0.99] transition-transform"
            >
              <span>Buy Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary: Add to Shopping Bag */}
            <button
              type="button"
              onClick={handleAddToBag}
              className="btn-ghost w-full py-3.5 flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-medium border border-gold/40 hover:border-gold text-gold hover:text-gold-dark transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{addedToCartToast ? 'Added to Bag ✓' : 'Add to Shopping Bag'}</span>
            </button>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Trust and Delivery Strip */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-muted font-light">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>Complimentary UK delivery</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>256-bit encrypted checkout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <ProductReviews productId={product.id} productName={product.name} />
    </div>
  );
};

export default ProductPage;