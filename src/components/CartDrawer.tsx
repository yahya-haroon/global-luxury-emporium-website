import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { getStripe, createPaymentIntent } from '../lib/stripePayment';
import { OrderAddress, CartItem } from '../types';
import { countryNameToIso2 } from '../lib/countryUtils';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: 'var(--ink, #141210)',
      fontFamily: "'Jost', system-ui, -apple-system, sans-serif",
      fontSmoothing: 'antialiased',
      fontSize: '16px', // 16px prevents iOS Safari auto-zoom
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
}

interface CompletedCartOrder {
  orderId: string;
  items: CartItem[];
  customerName: string;
  email: string;
  address: OrderAddress;
  deliveryZoneName: string;
  deliveryPrice: number;
  totalAmount: number;
  currency: string;
}

export const CartDrawer: React.FC = () => {
  const { isCartOpen, closeCart } = useCart();

  if (!isCartOpen) return null;

  return (
    <Elements stripe={getStripe()}>
      <CartDrawerContent onClose={closeCart} />
    </Elements>
  );
};

const CartDrawerContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const {
    items,
    totalCount,
    itemsSubtotal,
    personalisationSubtotal,
    requirementsSubtotal,
    deliveryPrice,
    totalAmount,
    selectedZone,
    selectedZoneId,
    setSelectedZoneId,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { settings } = useData();
  const stripe = useStripe();
  const elements = useElements();

  const [step, setStep] = useState<'bag' | 'checkout' | 'success'>('bag');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<CompletedCartOrder | null>(null);

  const [orderForm, setOrderForm] = useState<OrderFormState>({
    fullName: '',
    email: '',
    line1: '',
    city: '',
    postalCode: '',
    country: '',
  });

  // Lock body scroll and listen for ESC key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleInputChange = (field: keyof OrderFormState, value: string) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  };

  const validateCheckout = (): boolean => {
    if (!orderForm.fullName.trim()) {
      setErrorMessage('Please enter your full name for the order.');
      return false;
    }
    if (!orderForm.email.trim() || !/^\S+@\S+\.\S+$/.test(orderForm.email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
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
    return true;
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateCheckout()) return;

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
      const addressPayload: OrderAddress = {
        line1: orderForm.line1.trim(),
        city: orderForm.city.trim(),
        postal_code: orderForm.postalCode.trim(),
        country: orderForm.country.trim(),
      };

      // 1. Create multi-item PaymentIntent on server
      const intentRes = await createPaymentIntent({
        items,
        deliveryZoneId: selectedZoneId || selectedZone.id,
        customerName: orderForm.fullName.trim(),
        email: orderForm.email.trim(),
        address: addressPayload,
      });

      if (!intentRes.clientSecret) {
        throw new Error(intentRes.error || 'Failed to initialize payment with the processor.');
      }

      // Check for offline/demo mock secret
      if (intentRes.clientSecret.includes('mock_pi_')) {
        await new Promise((res) => setTimeout(res, 800));
        setCompletedOrder({
          orderId: intentRes.orderId,
          items: [...items],
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency || '£',
        });
        clearCart();
        setStep('success');
        setIsProcessing(false);
        return;
      }

      // 2. Confirm card payment with Stripe on-site
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
        throw new Error(confirmResult.error.message || 'Payment confirmation failed.');
      }

      if (confirmResult.paymentIntent?.status === 'succeeded') {
        setCompletedOrder({
          orderId: intentRes.orderId,
          items: [...items],
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency || '£',
        });
        clearCart();
        setStep('success');
      } else {
        throw new Error(`Unexpected payment status: ${confirmResult.paymentIntent?.status}`);
      }
    } catch (err: any) {
      console.error('Cart checkout payment error:', err);
      setErrorMessage(err.message || 'An error occurred during payment processing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const deliveryZones = settings.delivery_zones || [];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="cart-drawer-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop with smooth fade in */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel Container: Full width on mobile (<640px), 460px docked on desktop */}
      <div className="fixed inset-y-0 right-0 flex justify-end max-w-full w-full pointer-events-none">
        <div
          className="w-full sm:w-[460px] sm:max-w-md h-[100dvh] max-h-[100dvh] shadow-2xl flex flex-col border-l border-hairline transition-colors duration-200 pointer-events-auto animate-slide-in-right overflow-hidden"
          style={{
            backgroundColor: 'var(--iv, #F7F3EA)',
            color: 'var(--ink, #141210)',
          }}
        >
          {/* Drawer Top Header (respects top safe-area on notch phones) */}
          <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-hairline flex items-center justify-between bg-ivory/80 flex-shrink-0 pt-[max(14px,env(safe-area-inset-top,14px))]">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-5 h-5 text-gold flex-shrink-0" />
              <h2 id="cart-drawer-title" className="font-serif text-lg text-text font-medium truncate">
                {step === 'success'
                  ? 'Order Confirmed'
                  : step === 'checkout'
                  ? 'Secure Checkout'
                  : `Shopping Bag (${totalCount})`}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted hover:text-text rounded-full hover:bg-black/5 transition-colors -mr-1"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable with mobile inertia touch scrolling) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 overscroll-contain">
            {/* ================= STEP 1: SHOPPING BAG ================= */}
            {step === 'bag' && (
              <>
                {items.length === 0 ? (
                  <div className="py-14 sm:py-16 text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto border border-gold/30">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl text-text font-medium">Your Shopping Bag is empty</h3>
                      <p className="text-muted text-xs mt-1 font-light max-w-xs mx-auto">
                        Explore our handcrafted leather jacket collection and customize your bespoke pieces.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="btn-gold text-xs py-2.5 px-6 mt-2"
                    >
                      Explore Collection
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Items List */}
                    <div className="divide-y divide-hairline space-y-3.5">
                      {items.map((item) => (
                        <div key={item.id} className="pt-3.5 first:pt-0 flex gap-3 sm:gap-3.5 items-start">
                          {/* Image Thumbnail */}
                          <div className="w-16 h-20 sm:w-20 sm:h-24 bg-ivory rounded overflow-hidden border border-hairline flex-shrink-0">
                            <img
                              src={item.image || '/assets/products/shearling-aviator-jacket-main.png'}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1.5">
                              <Link
                                to={`/product/${item.productId}`}
                                onClick={onClose}
                                className="font-serif text-sm font-medium text-text hover:text-gold transition-colors line-clamp-1"
                              >
                                {item.productName}
                              </Link>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-muted hover:text-red-600 transition-colors p-1 -mr-1"
                                title="Remove item"
                                aria-label={`Remove ${item.productName}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Size & Options chips */}
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[10px] uppercase font-semibold text-text px-1.5 py-0.5 bg-black/5 rounded border border-hairline">
                                Size: {item.size}
                              </span>
                              {item.selectedOptions &&
                                Object.entries(item.selectedOptions).map(([k, v]) => (
                                  <span
                                    key={k}
                                    className="text-[10px] text-muted px-1.5 py-0.5 bg-black/5 rounded border border-hairline"
                                  >
                                    {k}: {v}
                                  </span>
                                ))}
                            </div>

                            {/* Personalisation note */}
                            {item.personalisationText && (
                              <p className="text-[11px] text-gold-dark italic mt-1 font-serif">
                                Monogram: "{item.personalisationText}"
                                {item.personalisationFee ? ` (+${settings.currency}${item.personalisationFee.toFixed(2)})` : ''}
                              </p>
                            )}

                            {/* Requirements note */}
                            {item.requirementsText && (
                              <p className="text-[10px] text-muted mt-0.5 line-clamp-1">
                                Note: {item.requirementsText}
                              </p>
                            )}

                            {/* Quantity and Price */}
                            <div className="flex items-center justify-between mt-2.5">
                              {/* Qty +/- */}
                              <div className="flex items-center border border-hairline rounded bg-ivory/60">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, -1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-muted hover:text-text transition-colors"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 sm:w-8 text-center text-xs font-semibold text-text">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-muted hover:text-text transition-colors"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                <span className="font-medium text-sm text-gold">
                                  {settings.currency}
                                  {(
                                    (item.price +
                                      (item.personalisationFee || 0) +
                                      (item.requirementsFee || 0)) *
                                    item.quantity
                                  ).toFixed(2)}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="block text-[10px] text-muted font-light">
                                    {settings.currency}{item.price.toFixed(2)} each
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Delivery Destination Selector & Single Flat Delivery Guarantee */}
                    <div className="p-3.5 bg-ivory/70 rounded-lg border border-hairline space-y-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-gold flex-shrink-0" />
                        <label
                          htmlFor="cart-delivery-zone"
                          className="text-xs uppercase tracking-wider font-semibold text-text"
                        >
                          Delivery Destination
                        </label>
                      </div>

                      {/* 16px font on mobile to prevent iOS Safari auto-zoom */}
                      <select
                        id="cart-delivery-zone"
                        value={selectedZoneId || selectedZone.id}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-xs rounded text-text focus:outline-none focus:border-gold"
                      >
                        {deliveryZones.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.name} — {Number(z.price) > 0 ? `${settings.currency}${Number(z.price).toFixed(2)}` : 'Free'}
                          </option>
                        ))}
                      </select>

                      {/* Explicit Flat Delivery Guarantee: Never charged per product */}
                      <p className="text-[11px] text-muted flex items-start gap-1.5 leading-snug">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Flat Delivery Rate:</strong> Charged <em>only once</em> for your entire order, regardless of how many jackets you purchase.
                        </span>
                      </p>
                    </div>

                    {/* Order Cost Breakdown */}
                    <div className="p-3.5 sm:p-4 bg-ivory/40 rounded-lg border border-hairline space-y-2 text-xs">
                      <div className="flex justify-between text-muted">
                        <span>Items Subtotal ({totalCount} {totalCount === 1 ? 'item' : 'items'})</span>
                        <span className="text-text font-medium">
                          {settings.currency}{itemsSubtotal.toFixed(2)}
                        </span>
                      </div>

                      {personalisationSubtotal > 0 && (
                        <div className="flex justify-between text-muted">
                          <span>Personalisation & Monograms</span>
                          <span className="text-text font-medium">
                            +{settings.currency}{personalisationSubtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {requirementsSubtotal > 0 && (
                        <div className="flex justify-between text-muted">
                          <span>Custom Requirements</span>
                          <span className="text-text font-medium">
                            +{settings.currency}{requirementsSubtotal.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-muted">
                        <span>Delivery ({selectedZone.name})</span>
                        <span className="text-text font-medium">
                          {deliveryPrice > 0 ? `${settings.currency}${deliveryPrice.toFixed(2)}` : 'Free'}
                        </span>
                      </div>

                      <div className="border-t border-hairline pt-2.5 flex justify-between items-center text-sm font-semibold">
                        <span className="text-text">Total</span>
                        <span className="text-gold text-lg">
                          {settings.currency}{totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ================= STEP 2: CHECKOUT & STRIPE PAYMENT ================= */}
            {step === 'checkout' && (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4 sm:space-y-5">
                {/* Back to Bag button */}
                <button
                  type="button"
                  onClick={() => {
                    setStep('bag');
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-gold transition-colors py-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to shopping bag
                </button>

                {/* Brief Order Summary pill */}
                <div className="p-3 bg-ivory/60 rounded border border-hairline flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium text-text">{totalCount} {totalCount === 1 ? 'jacket' : 'jackets'}</span>
                    <span className="text-muted block text-[11px]">Delivery to {selectedZone.name}</span>
                  </div>
                  <span className="text-gold font-bold text-base">
                    {settings.currency}{totalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-text border-b border-hairline pb-1">
                    Contact Information
                  </h3>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Eleanor Vance"
                      value={orderForm.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="eleanor@example.com"
                      value={orderForm.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider font-semibold text-text border-b border-hairline pb-1">
                    Shipping Address
                  </h3>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="124 Mayfair High St, Apt 4"
                      value={orderForm.line1}
                      onChange={(e) => handleInputChange('line1', e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="London"
                        value={orderForm.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                        Postal / ZIP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="W1J 8AJ"
                        value={orderForm.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-medium text-muted mb-1">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="United Kingdom"
                      value={orderForm.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full bg-white border border-hairline px-3 py-2 text-base sm:text-sm text-text rounded focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                {/* Stripe Card Payment */}
                <div className="space-y-2 pt-2 border-t border-hairline">
                  <label className="block text-[11px] uppercase tracking-wider font-medium text-muted">
                    Card Information <span className="text-red-500">*</span>
                  </label>
                  <div className="bg-white border border-hairline p-3 sm:p-3.5 rounded focus-within:border-gold transition-colors">
                    <CardElement options={CARD_ELEMENT_OPTIONS} />
                  </div>
                  <p className="text-[11px] text-muted flex items-center gap-1.5 font-light">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold flex-shrink-0" />
                    <span>256-bit encrypted checkout powered by Stripe.</span>
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Pay Button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-md"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Pay {settings.currency}{totalAmount.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ================= STEP 3: ORDER CONFIRMED SUCCESS ================= */}
            {step === 'success' && completedOrder && (
              <div className="py-6 space-y-5 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-serif text-2xl text-text font-medium">Thank you for your order</h3>
                  <p className="text-xs text-muted mt-1 font-light">
                    Order confirmation reference:
                  </p>
                  <span className="font-mono text-sm font-bold text-gold inline-block mt-0.5 bg-ivory px-3 py-1 rounded border border-hairline">
                    #{completedOrder.orderId.slice(0, 8)}
                  </span>
                </div>

                {/* Items Purchased List */}
                <div className="bg-ivory/60 rounded-lg border border-hairline p-3.5 sm:p-4 text-left space-y-3">
                  <h4 className="text-[11px] uppercase tracking-wider font-semibold text-text border-b border-hairline pb-1.5">
                    Jackets in this Order ({completedOrder.items.length})
                  </h4>
                  <div className="divide-y divide-hairline space-y-2">
                    {completedOrder.items.map((i, idx) => (
                      <div key={idx} className="pt-2 first:pt-0 flex justify-between items-center text-xs">
                        <div className="pr-2">
                          <p className="font-medium text-text">{i.productName}</p>
                          <p className="text-muted text-[11px]">
                            Size: {i.size} &bull; Qty: {i.quantity}
                          </p>
                        </div>
                        <span className="font-semibold text-gold flex-shrink-0">
                          {completedOrder.currency}{(i.price * i.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-hairline pt-2 text-xs space-y-1">
                    <div className="flex justify-between text-muted">
                      <span>Delivery ({completedOrder.deliveryZoneName})</span>
                      <span>
                        {completedOrder.deliveryPrice > 0
                          ? `${completedOrder.currency}${completedOrder.deliveryPrice.toFixed(2)}`
                          : 'Free'}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-text pt-1">
                      <span>Total Paid</span>
                      <span className="text-gold">
                        {completedOrder.currency}{completedOrder.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirmation Email note */}
                <p className="text-xs text-muted font-light leading-relaxed">
                  A receipt and dispatch updates will be sent to <strong>{completedOrder.email}</strong>.
                  Insured worldwide tracked shipping will commence once tailored.
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  className="btn-gold w-full py-3 text-xs font-semibold"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </div>

          {/* Drawer Bottom Bar for Step 1 (respects iPhone bottom home indicator) */}
          {step === 'bag' && items.length > 0 && (
            <div className="p-4 border-t border-hairline bg-ivory/95 space-y-2 flex-shrink-0 pb-[max(16px,env(safe-area-inset-bottom,16px))]">
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="btn-gold w-full py-3.5 flex items-center justify-center gap-2 text-sm font-semibold shadow-md active:scale-[0.99] transition-transform"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-muted hover:text-text py-1 transition-colors"
              >
                Continue Browsing Collection
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
