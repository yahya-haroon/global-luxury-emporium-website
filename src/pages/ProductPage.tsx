import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useData } from '../context/DataContext';
import { ProductOption, OrderAddress } from '../types';
import { normalizeProductOptions } from '../lib/options';
import { getStripe, createPaymentIntent } from '../lib/stripePayment';
import { countryNameToIso2 } from '../lib/countryUtils';
import { ArrowLeft, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#141210',
      fontFamily: "'Jost', system-ui, sans-serif",
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      '::placeholder': {
        color: '#8C8272',
      },
    },
    invalid: {
      color: '#dc2626',
      iconColor: '#dc2626',
    },
  },
};

interface OrderFormState {
  fullName: string;
  email: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
  deliveryZoneId: string;
}

interface CompletedOrderDetails {
  orderId: string;
  productName: string;
  size: string;
  selectedOptions: Record<string, string>;
  productPrice: number;
  personalisationText: string;
  personalisationFee: number;
  requirementsText: string;
  requirementsFee: number;
  deliveryZoneName: string;
  deliveryPrice: number;
  totalAmount: number;
  currency: string;
  customerName: string;
  email: string;
  address: OrderAddress;
}

export const ProductPage: React.FC = () => {
  return (
    <Elements stripe={getStripe()}>
      <ProductPageContent />
    </Elements>
  );
};

const ProductPageContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { products, settings, loading } = useData();
  const navigate = useNavigate();

  const stripe = useStripe();
  const elements = useElements();

  const product = products.find((p) => p.id === id);

  const [selectedImage, setSelectedImage] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [personalisationText, setPersonalisationText] = useState<string>('');
  const [requirementsText, setRequirementsText] = useState<string>('');

  const [orderForm, setOrderForm] = useState<OrderFormState>({
    fullName: '',
    email: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
    deliveryZoneId: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderDetails | null>(null);

  // Initialize delivery zone when settings load
  useEffect(() => {
    if (settings.delivery_zones && settings.delivery_zones.length > 0 && !orderForm.deliveryZoneId) {
      setOrderForm((prev) => ({
        ...prev,
        deliveryZoneId: settings.delivery_zones[0].id,
      }));
    }
  }, [settings.delivery_zones, orderForm.deliveryZoneId]);

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
        Loading bespoke jacket details...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="font-serif text-3xl text-gradient-gold">
          Product Not Found
        </h2>
        <p className="text-muted font-light">
          The jacket you are looking for does not exist or has been archived.
        </p>
        <Link
          to="/"
          className="btn-gold inline-flex items-center gap-2 mt-4"
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

  // Active delivery zone lookup
  const deliveryZones = settings.delivery_zones || [];
  const selectedZone =
    deliveryZones.find((z) => z.id === orderForm.deliveryZoneId) ||
    deliveryZones[0] || { id: 'standard', name: 'Standard Delivery', price: 0 };

  // Price calculations
  const productPrice = product.price;

  const hasPersonalisationInput = Boolean(personalisationText.trim());
  const personalisationFee =
    showPersonalisation &&
    settings.personalisation.charge &&
    settings.personalisation.price > 0 &&
    hasPersonalisationInput
      ? settings.personalisation.price
      : 0;

  const hasRequirementsInput = Boolean(requirementsText.trim());
  const requirementsFee =
    showRequirements &&
    settings.requirements.charge &&
    settings.requirements.price > 0 &&
    hasRequirementsInput
      ? settings.requirements.price
      : 0;

  const deliveryPrice = Number(selectedZone.price || 0);

  const totalAmount = Number((productPrice + personalisationFee + requirementsFee + deliveryPrice).toFixed(2));

  const updateSelectedOption = (name: string, value: string) => {
    setSelectedOptions((current) => ({
      ...current,
      [name]: value,
    }));
    setErrorMessage(null);
  };

  const handleOrderFormChange = (field: keyof OrderFormState, value: string) => {
    setOrderForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrorMessage(null);
  };

  const validateOrder = (): boolean => {
    // 1. Required product options
    for (const option of productOptions) {
      const val = (selectedOptions[option.name] || '').trim();
      if (option.required && !val) {
        setErrorMessage(`Please select or enter ${option.label || option.name}.`);
        return false;
      }
    }

    // 2. Size
    if (!selectedSize) {
      setErrorMessage('Please select a jacket size.');
      return false;
    }

    // 3. Contact Details
    if (!orderForm.fullName.trim()) {
      setErrorMessage('Please enter your full name for the order.');
      return false;
    }

    if (!orderForm.email.trim() || !/^\S+@\S+\.\S+$/.test(orderForm.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    // 4. Delivery Address
    if (!orderForm.line1.trim()) {
      setErrorMessage('Please enter your delivery street address.');
      return false;
    }

    if (!orderForm.city.trim()) {
      setErrorMessage('Please enter your delivery city.');
      return false;
    }

    if (!orderForm.postalCode.trim()) {
      setErrorMessage('Please enter your postal/ZIP code.');
      return false;
    }

    if (!orderForm.country.trim()) {
      setErrorMessage('Please enter your delivery country.');
      return false;
    }

    // 5. Delivery Zone
    if (!orderForm.deliveryZoneId) {
      setErrorMessage('Please select a delivery zone.');
      return false;
    }

    return true;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateOrder()) {
      return;
    }

    if (!stripe || !elements) {
      setErrorMessage('Payment service is still loading. Please try again in a moment.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setErrorMessage('Card payment input was not found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create PaymentIntent on server
      const addressPayload: OrderAddress = {
        line1: orderForm.line1.trim(),
        city: orderForm.city.trim(),
        postal_code: orderForm.postalCode.trim(),
        country: orderForm.country.trim(),
      };

      const intentRes = await createPaymentIntent({
        productId: product.id,
        size: selectedSize,
        selectedOptions,
        personalisationText: personalisationText.trim(),
        requirementsText: requirementsText.trim(),
        deliveryZoneId: orderForm.deliveryZoneId,
        customerName: orderForm.fullName.trim(),
        email: orderForm.email.trim(),
        address: addressPayload,
      });

      if (!intentRes.clientSecret) {
        throw new Error(intentRes.error || 'Failed to initialize payment with the processor.');
      }

      // Check if running in mock/demo fallback mode
      if (intentRes.clientSecret.includes('mock_pi_')) {
        // Simulated success for demo/offline preview mode
        await new Promise((res) => setTimeout(res, 800));
        setCompletedOrder({
          orderId: intentRes.orderId,
          productName: product.name,
          size: selectedSize,
          selectedOptions,
          productPrice,
          personalisationText: personalisationText.trim(),
          personalisationFee,
          requirementsText: requirementsText.trim(),
          requirementsFee,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency,
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
        });
        setIsProcessing(false);
        return;
      }

      // 2. Confirm card payment with Stripe directly on-site
      const confirmResult = await stripe.confirmCardPayment(intentRes.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: orderForm.fullName.trim(),
            email: orderForm.email.trim(),
            address: {
              line1: addressPayload.line1,
              city: addressPayload.city,
              postal_code: addressPayload.postal_code,
              country: countryNameToIso2(addressPayload.country),
            },
          },
        },
      });

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Payment card authorization failed.');
      }

      if (confirmResult.paymentIntent && confirmResult.paymentIntent.status === 'succeeded') {
        setCompletedOrder({
          orderId: intentRes.orderId,
          productName: product.name,
          size: selectedSize,
          selectedOptions,
          productPrice,
          personalisationText: personalisationText.trim(),
          personalisationFee,
          requirementsText: requirementsText.trim(),
          requirementsFee,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency,
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
        });
      } else {
        throw new Error('Payment was not completed. Please try again.');
      }
    } catch (err: any) {
      console.error('Order payment error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while processing payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 animate-fade-in">
        <div className="bg-white border border-hairline p-8 sm:p-12 rounded-lg shadow-luxury-card text-center space-y-6">
          <div className="w-16 h-16 bg-ivory text-gold rounded-full flex items-center justify-center mx-auto border border-gold/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="sm block text-gold" style={{ letterSpacing: '0.24em' }}>
            Payment Successful
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium">
            Thank you for your order
          </h1>

          <p className="text-muted font-light max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Your handcrafted order has been received and scheduled for artisan finishing in our dedicated factory. An itemised receipt has been sent to{' '}
            <strong className="text-text font-medium">{completedOrder.email}</strong>.
          </p>

          <div className="text-xs text-muted font-mono bg-ivory py-2 px-4 rounded border border-hairline inline-block">
            Order Reference: {completedOrder.orderId}
          </div>

          {/* Itemised Breakdown */}
          <div className="border-t border-b border-hairline py-6 text-left space-y-3 font-light text-sm">
            <h3 className="sm text-text mb-3" style={{ fontSize: '11px' }}>
              Itemised Summary
            </h3>

            <div className="flex justify-between items-center text-text">
              <span>{completedOrder.productName} ({completedOrder.size})</span>
              <span>{completedOrder.currency}{completedOrder.productPrice.toFixed(2)}</span>
            </div>

            {Object.entries(completedOrder.selectedOptions).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-xs text-muted pl-3">
                <span>{k}: {v}</span>
                <span>Included</span>
              </div>
            ))}

            {completedOrder.personalisationText && (
              <div className="flex justify-between items-center text-text">
                <span>Personalisation: "{completedOrder.personalisationText}"</span>
                <span>
                  {completedOrder.personalisationFee > 0
                    ? `${completedOrder.currency}${completedOrder.personalisationFee.toFixed(2)}`
                    : 'Included'}
                </span>
              </div>
            )}

            {completedOrder.requirementsText && (
              <div className="flex justify-between items-center text-text">
                <span>Additional requirements: "{completedOrder.requirementsText}"</span>
                <span>
                  {completedOrder.requirementsFee > 0
                    ? `${completedOrder.currency}${completedOrder.requirementsFee.toFixed(2)}`
                    : 'Included'}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-text">
              <span>Delivery ({completedOrder.deliveryZoneName})</span>
              <span>
                {completedOrder.deliveryPrice > 0
                  ? `${completedOrder.currency}${completedOrder.deliveryPrice.toFixed(2)}`
                  : 'Free'}
              </span>
            </div>

            <div className="border-t border-hairline pt-3 flex justify-between items-center text-base font-medium text-text">
              <span>Total Paid</span>
              <span className="text-gold text-lg">
                {completedOrder.currency}{completedOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Delivery Address Details */}
          <div className="text-left bg-ivory/50 p-4 rounded border border-hairline text-xs space-y-1">
            <span className="sm block text-muted mb-1" style={{ fontSize: '10px' }}>
              Delivery Destination
            </span>
            <p className="font-medium text-text">{completedOrder.customerName}</p>
            <p className="text-muted">{completedOrder.address.line1}</p>
            <p className="text-muted">
              {completedOrder.address.city}, {completedOrder.address.postal_code}
            </p>
            <p className="text-muted">{completedOrder.address.country}</p>
          </div>

          <div className="pt-4">
            <Link
              to="/"
              className="btn-gold inline-flex items-center gap-2 text-xs uppercase tracking-widest px-8 py-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Collection
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // MAIN FULL PRODUCT PAGE EDITORIAL VIEW
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 animate-fade-in">
      {/* Back to Collection Navigation */}
      <button
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-gold transition-colors mb-8 focus:outline-none focus-visible:text-gold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to collection
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">
        {/* Left Column: Image Gallery */}
        <div className="flex flex-col gap-4 sticky top-24">
          <div className="aspect-[4/5] bg-ivory rounded overflow-hidden border border-hairline relative shadow-sm">
            <img
              src={selectedImage || product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
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
                  aria-label={`View photo ${idx + 1}`}
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

        {/* Right Column: Information, Options, Order Form, and Stripe Payment */}
        <div className="flex flex-col">
          <span className="sm text-gold block mb-2" style={{ letterSpacing: '0.24em' }}>
            {product.category} Collection
          </span>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-text font-medium leading-tight">
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

          {/* Dynamic Product Options (Color chips, select, etc.) */}
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
                      <span className="text-red-500 ml-1" title="Required">*</span>
                    )}
                  </label>

                  {/* SELECT */}
                  {option.type === 'select' && (
                    <select
                      id={`product-option-${option.name}`}
                      value={selectedOptions[option.name] || ''}
                      onChange={(e) =>
                        updateSelectedOption(option.name, e.target.value)
                      }
                      className="w-full bg-white border border-hairline px-3 py-2.5 text-sm text-text rounded focus:outline-none focus:border-gold"
                    >
                      {(!option.required || !selectedOptions[option.name]) && (
                        <option value="">
                          Select {option.label || option.name}
                        </option>
                      )}
                      {option.values.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* RADIO & COLOR CHIPS */}
                  {(option.type === 'radio' || option.type === 'color') && (
                    <div
                      className="flex flex-wrap gap-2.5"
                      role="radiogroup"
                      aria-label={option.label || option.name}
                    >
                      {option.values.map((value) => {
                        const isSelected = selectedOptions[option.name] === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() =>
                              updateSelectedOption(option.name, value)
                            }
                            className={`filter-chip ${isSelected ? 'active' : ''}`}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* TEXT */}
                  {option.type === 'text' && (
                    <input
                      id={`product-option-${option.name}`}
                      type="text"
                      placeholder={option.placeholder || `Enter ${option.label || option.name}`}
                      value={selectedOptions[option.name] || ''}
                      onChange={(e) =>
                        updateSelectedOption(option.name, e.target.value)
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  )}

                  {/* TEXTAREA */}
                  {option.type === 'textarea' && (
                    <textarea
                      id={`product-option-${option.name}`}
                      rows={3}
                      placeholder={option.placeholder || `Enter ${option.label || option.name}`}
                      value={selectedOptions[option.name] || ''}
                      onChange={(e) =>
                        updateSelectedOption(option.name, e.target.value)
                      }
                      className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Personalisation Box */}
          {showPersonalisation && (
            <div className="mb-5 p-4 bg-ivory/70 border border-hairline rounded">
              <label
                htmlFor="page-personalisation-input"
                className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1.5"
              >
                {settings.personalisation.label}{' '}
                <span className="text-muted lowercase">(optional)</span>
              </label>

              <input
                id="page-personalisation-input"
                type="text"
                maxLength={30}
                placeholder={settings.personalisation.hint}
                value={personalisationText}
                onChange={(e) => setPersonalisationText(e.target.value)}
                className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
              />

              <p className="text-[12px] text-muted mt-1.5 font-light">
                {settings.personalisation.charge && settings.personalisation.price > 0
                  ? `Personalisation adds ${settings.currency}${settings.personalisation.price.toFixed(2)}.`
                  : 'Personalisation is free (no extra charge).'}
              </p>
            </div>
          )}

          {/* Additional Requirements Box */}
          {showRequirements && (
            <div className="mb-6 p-4 bg-ivory/70 border border-hairline rounded">
              <label
                htmlFor="page-requirements-input"
                className="block text-xs uppercase tracking-[0.12em] font-medium text-text mb-1.5"
              >
                {settings.requirements.label}{' '}
                <span className="text-muted lowercase">(optional)</span>
              </label>

              <textarea
                id="page-requirements-input"
                rows={3}
                maxLength={110}
                placeholder={settings.requirements.hint}
                value={requirementsText}
                onChange={(e) => setRequirementsText(e.target.value)}
                className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold resize-none"
              />

              <p className="text-[12px] text-muted mt-1.5 font-light">
                {settings.requirements.charge && settings.requirements.price > 0
                  ? `Additional requirements add ${settings.currency}${settings.requirements.price.toFixed(2)}.`
                  : 'No extra charge for this.'}
              </p>
            </div>
          )}

          {/* ORDER FORM & ON-SITE STRIPE CHECKOUT */}
          <form onSubmit={handlePaymentSubmit} className="border-t border-hairline pt-6 space-y-6">
            <div>
              <h3 className="sm text-text mb-1" style={{ letterSpacing: '0.18em' }}>
                Delivery & Contact Details
              </h3>
              <p className="text-xs text-muted font-light mb-4">
                Please provide your shipping destination and contact email for order confirmation.
              </p>
            </div>

            {/* Full Name & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customer-name" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={orderForm.fullName}
                  onChange={(e) => handleOrderFormChange('fullName', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label htmlFor="customer-email" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-email"
                  type="email"
                  required
                  placeholder="eleanor@example.com"
                  value={orderForm.email}
                  onChange={(e) => handleOrderFormChange('email', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* Address Line 1 */}
            <div>
              <label htmlFor="customer-address1" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                id="customer-address1"
                type="text"
                required
                placeholder="Flat / House number and Street name"
                value={orderForm.line1}
                onChange={(e) => handleOrderFormChange('line1', e.target.value)}
                className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
              />
            </div>

            {/* City, Postal Code, Country */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="customer-city" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-city"
                  type="text"
                  required
                  placeholder="London"
                  value={orderForm.city}
                  onChange={(e) => handleOrderFormChange('city', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label htmlFor="customer-postcode" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-postcode"
                  type="text"
                  required
                  placeholder="W1B 3HH"
                  value={orderForm.postalCode}
                  onChange={(e) => handleOrderFormChange('postalCode', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label htmlFor="customer-country" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                  Country <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-country"
                  type="text"
                  required
                  placeholder="United Kingdom"
                  value={orderForm.country}
                  onChange={(e) => handleOrderFormChange('country', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2 text-sm text-text rounded focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            {/* Delivery Zone Dropdown */}
            <div>
              <label htmlFor="customer-zone" className="block text-xs uppercase tracking-[0.12em] font-medium text-muted mb-1.5">
                Delivery Zone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  id="customer-zone"
                  value={orderForm.deliveryZoneId}
                  onChange={(e) => handleOrderFormChange('deliveryZoneId', e.target.value)}
                  className="w-full bg-white border border-hairline px-3 py-2.5 text-sm text-text rounded focus:outline-none focus:border-gold"
                >
                  {deliveryZones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {Number(zone.price) > 0 ? `${settings.currency}${Number(zone.price).toFixed(2)}` : 'Free (no extra charge)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* LIVE ITEMISED ORDER SUMMARY */}
            <div className="bg-ivory/80 border border-hairline p-5 rounded-lg space-y-2.5">
              <span className="sm block text-gold mb-2" style={{ letterSpacing: '0.18em' }}>
                Order Summary
              </span>

              <div className="flex justify-between items-center text-sm text-text">
                <span>Jacket</span>
                <span>{settings.currency}{productPrice.toFixed(2)}</span>
              </div>

              {personalisationFee > 0 && (
                <div className="flex justify-between items-center text-sm text-text">
                  <span>Personalisation</span>
                  <span>{settings.currency}{personalisationFee.toFixed(2)}</span>
                </div>
              )}

              {requirementsFee > 0 && (
                <div className="flex justify-between items-center text-sm text-text">
                  <span>Additional requirements</span>
                  <span>{settings.currency}{requirementsFee.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm text-text">
                <span>Delivery ({selectedZone.name})</span>
                <span>
                  {deliveryPrice > 0
                    ? `${settings.currency}${deliveryPrice.toFixed(2)}`
                    : 'Free'}
                </span>
              </div>

              <div className="border-t border-hairline pt-3 flex justify-between items-center text-lg font-medium text-text">
                <span className="font-serif">Total</span>
                <span className="text-gold font-medium">
                  {settings.currency}{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* EMBEDDED STRIPE CARD ELEMENT */}
            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-[0.12em] font-medium text-muted">
                Card Information <span className="text-red-500">*</span>
              </label>

              <div className="bg-white border border-hairline p-3.5 rounded focus-within:border-gold transition-colors">
                <CardElement options={CARD_ELEMENT_OPTIONS} />
              </div>

              <p className="text-[11px] text-muted flex items-center gap-1.5 pt-1 font-light">
                <ShieldCheck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                <span>Encrypted 256-bit checkout powered by Stripe. You never leave our site.</span>
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Payment Button */}
            <div>
              <button
                type="submit"
                disabled={isProcessing}
                className="btn w-full flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <span>Pay {settings.currency}{totalAmount.toFixed(2)}</span>
                )}
              </button>

              <p className="text-center text-xs text-muted mt-3 font-light">
                Direct card checkout. Worldwide insured shipping with bespoke packaging.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};