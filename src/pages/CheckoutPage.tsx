import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { getStripe, createPaymentIntent } from '../lib/stripePayment';
import { countryNameToIso2 } from '../lib/countryUtils';
import { CartItem, OrderAddress } from '../types';
import { ClarityAnalytics } from '../lib/clarity';
import {
  ShieldCheck,
  Lock,
  Truck,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ShoppingBag,
  ExternalLink,
  CreditCard,
  Calendar,
  KeyRound,
} from 'lucide-react';
import { SEO } from '../components/SEO';

// Stripe Split Card Element Styling: Sharp black text and dark clear placeholders
const SPLIT_CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#000000',
      fontFamily: "'Jost', system-ui, -apple-system, sans-serif",
      fontSmoothing: 'antialiased',
      fontSize: '15px',
      fontWeight: '500',
      '::placeholder': {
        color: '#4B5563', // Crisp dark placeholder instead of cream
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
  phone: string;
  line1: string;
  city: string;
  postalCode: string;
  country: string;
}

interface CompletedOrderInfo {
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

const COMMON_COUNTRIES = [
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Netherlands',
  'Ireland',
  'Switzerland',
  'United Arab Emirates',
  'Saudi Arabia',
  'Japan',
  'Singapore',
  'New Zealand',
];

const CheckoutContent: React.FC = () => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { items, clearCart } = useCart();
  const { settings } = useData();

  const [orderForm, setOrderForm] = useState<OrderFormState>({
    fullName: '',
    email: '',
    phone: '',
    line1: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
  });

  const [selectedZoneId, setSelectedZoneId] = useState<string>('uk');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrderInfo | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  // Automatically synchronize delivery zone with country selection
  useEffect(() => {
    if (orderForm.country === 'United Kingdom') {
      const ukZone = settings.delivery_zones?.find(
        (z) => z.id === 'uk' || z.name.toLowerCase().includes('united kingdom')
      );
      if (ukZone) setSelectedZoneId(ukZone.id);
    } else {
      const rowZone = settings.delivery_zones?.find(
        (z) => z.id !== 'uk' && !z.name.toLowerCase().includes('united kingdom')
      );
      if (rowZone) setSelectedZoneId(rowZone.id);
    }
  }, [orderForm.country, settings.delivery_zones]);

  // Pricing calculations
  const itemsSubtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const itemsPersonalisationFee = items.reduce(
    (sum, item) => sum + (item.personalisationFee || 0) * (item.quantity || 1),
    0
  );
  const itemsRequirementsFee = items.reduce(
    (sum, item) => sum + (item.requirementsFee || 0) * (item.quantity || 1),
    0
  );

  const selectedZone =
    settings.delivery_zones?.find((z) => z.id === selectedZoneId) ||
    settings.delivery_zones?.[0] || { id: 'uk', name: 'United Kingdom', price: 0 };

  const deliveryPrice = Number(selectedZone.price || 0);
  const totalAmount = itemsSubtotal + itemsPersonalisationFee + itemsRequirementsFee + deliveryPrice;

  // Track checkout view
  useEffect(() => {
    if (items.length > 0) {
      ClarityAnalytics.checkoutStarted({
        totalAmount,
        itemCount: items.length,
      });
    }
  }, [items.length]);

  const handleInputChange = (field: keyof OrderFormState, value: string) => {
    setOrderForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCopyOrderId = () => {
    if (!completedOrder?.orderId) return;
    navigator.clipboard.writeText(completedOrder.orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!orderForm.fullName.trim()) {
      setErrorMessage('Please enter your full name for delivery.');
      return;
    }
    if (!orderForm.email.trim() || !orderForm.email.includes('@')) {
      setErrorMessage('Please enter a valid email address for order updates.');
      return;
    }
    if (!orderForm.line1.trim()) {
      setErrorMessage('Please enter your street address.');
      return;
    }
    if (!orderForm.city.trim()) {
      setErrorMessage('Please enter your city.');
      return;
    }
    if (!orderForm.postalCode.trim()) {
      setErrorMessage('Please enter your postal or ZIP code.');
      return;
    }

    if (!stripe || !elements) {
      setErrorMessage('Payment service is still loading. Please try again in a moment.');
      return;
    }

    // Split elements: CardNumberElement is passed as card token reference
    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setErrorMessage('Card details input could not be found. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      const addressPayload: OrderAddress = {
        line1: orderForm.line1.trim(),
        city: orderForm.city.trim(),
        postal_code: orderForm.postalCode.trim() || 'N/A',
        country: orderForm.country.trim(),
      };

      // 1. Create PaymentIntent via secure backend Edge Function
      const intentRes = await createPaymentIntent({
        items,
        deliveryZoneId: selectedZoneId || selectedZone.id,
        customerName: orderForm.fullName.trim(),
        email: orderForm.email.trim(),
        address: addressPayload,
      });

      if (!intentRes.clientSecret) {
        throw new Error(intentRes.error || 'Failed to initialize payment.');
      }

      // Check for offline/demo mock
      if (intentRes.clientSecret.includes('mock_pi_')) {
        await new Promise((res) => setTimeout(res, 800));
        const orderData: CompletedOrderInfo = {
          orderId: intentRes.orderId,
          items: [...items],
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency || '£',
        };
        setCompletedOrder(orderData);
        ClarityAnalytics.orderCompleted({
          orderId: intentRes.orderId,
          totalAmount,
          currency: settings.currency || '£',
        });
        clearCart();
        setIsProcessing(false);
        return;
      }

      // 2. Confirm card payment with Stripe on-site using split element
      const confirmResult = await stripe.confirmCardPayment(intentRes.clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: orderForm.fullName.trim(),
            email: orderForm.email.trim(),
            phone: orderForm.phone.trim() || undefined,
            address: {
              line1: addressPayload.line1,
              city: addressPayload.city,
              postal_code: addressPayload.postal_code !== 'N/A' ? addressPayload.postal_code : undefined,
              country: countryNameToIso2(addressPayload.country),
            },
          },
        },
      });

      if (confirmResult.error) {
        throw new Error(confirmResult.error.message || 'Payment confirmation failed.');
      }

      if (confirmResult.paymentIntent?.status === 'succeeded') {
        const orderData: CompletedOrderInfo = {
          orderId: intentRes.orderId,
          items: [...items],
          customerName: orderForm.fullName.trim(),
          email: orderForm.email.trim(),
          address: addressPayload,
          deliveryZoneName: selectedZone.name,
          deliveryPrice,
          totalAmount,
          currency: settings.currency || '£',
        };
        setCompletedOrder(orderData);
        ClarityAnalytics.orderCompleted({
          orderId: intentRes.orderId,
          totalAmount,
          currency: settings.currency || '£',
        });
        clearCart();
      } else {
        throw new Error(`Unexpected payment status: ${confirmResult.paymentIntent?.status}`);
      }
    } catch (err: any) {
      console.error('Checkout payment error:', err);
      setErrorMessage(err.message || 'An error occurred during payment processing. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS SCREEN
  if (completedOrder) {
    const whatsappText = encodeURIComponent(
      `Hello Global Luxury Emporium, I have placed Order #${completedOrder.orderId} for bespoke tailoring. My name is ${completedOrder.customerName}.`
    );
    const whatsappUrl = `https://wa.me/${(settings.whatsapp || '+923278434142').replace(/\+/g, '')}?text=${whatsappText}`;

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center animate-fade-in">
        <SEO
          title="Order Confirmed | Global Luxury Emporium"
          description="Your handcrafted bespoke leather order has been received and confirmed."
          canonical="/checkout"
        />

        <div className="w-16 h-16 bg-black text-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="sm uppercase tracking-[0.24em] text-black block mb-2 font-bold text-xs">
          Order Successfully Placed
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl text-black font-semibold mb-3">
          Thank you, {completedOrder.customerName}
        </h1>
        <p className="text-gray-700 text-sm max-w-md mx-auto mb-8 font-normal leading-relaxed">
          Your bespoke order has been confirmed. A receipt and confirmation have been sent to{' '}
          <strong className="text-black font-bold">{completedOrder.email}</strong>.
        </p>

        {/* Order Reference Box */}
        <div className="bg-white border border-gray-300 rounded-lg p-5 sm:p-6 mb-8 text-left shadow-sm max-w-xl mx-auto">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-black font-bold block">
                Order Reference
              </span>
              <span className="font-mono text-base font-bold text-black">
                #{completedOrder.orderId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyOrderId}
              className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 border border-gray-300 hover:border-black text-black font-medium"
              title="Copy Order ID"
            >
              {copiedOrderId ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5 text-black" />}
              <span>{copiedOrderId ? 'Copied' : 'Copy ID'}</span>
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Items Ordered:</span>
              <span className="text-black font-bold">{completedOrder.items.length} piece(s)</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Delivery Method:</span>
              <span className="text-black font-bold">{completedOrder.deliveryZoneName}</span>
            </div>
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Destination:</span>
              <span className="text-black font-bold text-right truncate max-w-[240px]">
                {completedOrder.address.city}, {completedOrder.address.country}
              </span>
            </div>
            <div className="flex justify-between text-gray-700 pt-2 border-t border-gray-200 text-sm font-bold text-black">
              <span>Total Paid:</span>
              <span className="text-black">
                {completedOrder.currency}
                {completedOrder.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline & WhatsApp Concierge */}
        <div className="bg-white border border-gray-300 rounded-lg p-4 sm:p-5 mb-8 max-w-xl mx-auto text-left flex items-start gap-3.5 shadow-sm">
          <Truck className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-700 leading-relaxed font-normal">
            <strong className="text-black font-bold block mb-0.5">Bespoke Artisan Tailoring:</strong>
            Each leather piece is tailored to order with meticulous attention to detail. Standard handcrafted delivery
            typically takes 1 to 2 weeks. You will receive tracking coordinates once dispatched.
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-black hover:bg-black hover:text-white text-black text-xs py-3 px-6 font-semibold transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-gold w-full sm:w-auto text-xs py-3 px-8 font-bold text-black"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  // EMPTY BAG STATE
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <SEO title="Checkout | Global Luxury Emporium" description="Checkout" canonical="/checkout" />
        <div className="w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center mx-auto mb-4 text-black shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl text-black font-semibold mb-2">
          Your Shopping Bag is Empty
        </h1>
        <p className="text-xs sm:text-sm text-gray-700 max-w-md mx-auto mb-6 font-normal">
          You do not have any handcrafted leather pieces in your shopping bag yet.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-gold text-xs py-3 px-8 font-bold text-black"
        >
          Explore Collection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <SEO
        title="Secure Checkout | Global Luxury Emporium"
        description="Complete your order for bespoke handcrafted leather jackets with secure Stripe 256-bit encrypted checkout."
        canonical="/checkout"
      />

      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between pb-6 mb-8 border-b border-gray-200">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-black hover:underline font-bold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-black" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2 text-xs text-black font-medium">
          <Lock className="w-3.5 h-3.5 text-black" />
          <span>256-Bit Encrypted Stripe Checkout</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* LEFT COLUMN: DELIVERY INFO & STRIPE PAYMENT (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handlePaymentSubmit} className="space-y-8" data-clarity-mask="true">
            {/* STEP 1: CONTACT & DELIVERY */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-7 shadow-sm space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <span className="sm uppercase tracking-[0.2em] text-black font-bold block text-xs">
                  Step 1 of 2
                </span>
                <h2 className="font-serif text-2xl text-black font-semibold mt-1">
                  Delivery Details
                </h2>
                <p className="text-xs text-gray-600 font-normal mt-0.5">
                  Where should we ship your handcrafted garments?
                </p>
              </div>

              {/* Full Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="customer-name" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    required
                    placeholder="e.g. Lord James Hamilton"
                    value={orderForm.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="customer-email" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    required
                    placeholder="e.g. james@hamilton.co.uk"
                    value={orderForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Phone (Optional for courier updates) */}
              <div>
                <label htmlFor="customer-phone" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                  Phone / WhatsApp <span className="text-gray-500 font-normal">(for courier tracking updates)</span>
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. +44 7700 900077"
                  value={orderForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                />
              </div>

              {/* Street Address */}
              <div>
                <label htmlFor="customer-address" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="customer-address"
                  type="text"
                  required
                  placeholder="e.g. 14 Kensington Palace Gardens, Apt 4B"
                  value={orderForm.line1}
                  onChange={(e) => handleInputChange('line1', e.target.value)}
                  className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                />
              </div>

              {/* City, Postal Code, Country */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="customer-city" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                    Town / City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-city"
                    type="text"
                    required
                    placeholder="e.g. London"
                    value={orderForm.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="customer-postal" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                    Postal / ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-postal"
                    type="text"
                    required
                    placeholder="e.g. W8 4PX"
                    value={orderForm.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black placeholder:text-gray-500 rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label htmlFor="customer-country" className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="customer-country"
                    value={orderForm.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    className="w-full bg-white border border-gray-300 px-3.5 py-2.5 text-sm text-black rounded focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all shadow-sm"
                  >
                    {COMMON_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delivery Zone Selector */}
              {settings.delivery_zones && settings.delivery_zones.length > 0 && (
                <div className="pt-2">
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-2">
                    Shipping Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {settings.delivery_zones.map((zone) => {
                      const isSelected = selectedZoneId === zone.id;
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          onClick={() => setSelectedZoneId(zone.id)}
                          className={`p-3.5 text-left rounded border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'border-black bg-black/5 shadow-sm'
                              : 'border-gray-200 bg-white hover:border-black'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold text-black">
                              {zone.name}
                            </span>
                            <span className="text-[11px] text-gray-600 font-normal">
                              {zone.price === 0 ? 'Complimentary Insured Delivery' : 'Express Tracked Courier'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-black">
                            {zone.price === 0 ? 'FREE' : `${settings.currency}${zone.price.toFixed(2)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: PAYMENT CARD DETAILS WITH SEPARATE BOXES */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-7 shadow-sm space-y-6">
              <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
                <div>
                  <span className="sm uppercase tracking-[0.2em] text-black font-bold block text-xs">
                    Step 2 of 2
                  </span>
                  <h2 className="font-serif text-2xl text-black font-semibold mt-1">
                    Card Payment Details
                  </h2>
                  <p className="text-xs text-gray-600 font-normal mt-0.5">
                    Enter your card details in the secure boxes below.
                  </p>
                </div>
                <ShieldCheck className="w-7 h-7 text-black flex-shrink-0" />
              </div>

              {/* THREE SEPARATE BOXES FOR CARD NUMBER, EXPIRY, AND CVV */}
              <div className="space-y-4">
                {/* 1. SEPARATE BOX: CARD NUMBER */}
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-black" />
                      <span>Card Number</span>
                    </span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="p-3.5 bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm">
                    <CardNumberElement options={SPLIT_CARD_ELEMENT_OPTIONS} />
                  </div>
                </div>

                {/* 2 & 3. SEPARATE BOXES: EXPIRY DATE AND CVV */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* EXPIRY DATE BOX */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-black" />
                        <span>Expiry Date</span>
                      </span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="p-3.5 bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm">
                      <CardExpiryElement options={SPLIT_CARD_ELEMENT_OPTIONS} />
                    </div>
                  </div>

                  {/* CVV / CVC BOX */}
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-black" />
                        <span>CVV / CVC</span>
                      </span>
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="p-3.5 bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm">
                      <CardCvcElement options={SPLIT_CARD_ELEMENT_OPTIONS} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-gray-700 font-normal pt-1">
                  <Lock className="w-3.5 h-3.5 text-black flex-shrink-0" />
                  <span>Encrypted 256-bit Stripe authorization. Card information is processed securely.</span>
                </div>
              </div>

              {/* Error banner */}
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Place Order / Buy Now Button */}
              <div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn-gold w-full py-4 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform text-black"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Authorising Secure Payment...</span>
                    </>
                  ) : (
                    <span>
                      Pay {settings.currency || '£'}
                      {totalAmount.toFixed(2)} &nbsp;&bull;&nbsp; Complete Order
                    </span>
                  )}
                </button>

                <p className="text-center text-[11px] text-gray-600 mt-3 font-normal">
                  By clicking complete order, your card will be charged{' '}
                  <strong className="text-black font-bold">
                    {settings.currency || '£'}
                    {totalAmount.toFixed(2)}
                  </strong>
                  .
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-lg p-5 sm:p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
          <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-black font-semibold">Order Summary</h2>
            <span className="text-xs text-black font-bold">{items.length} piece(s)</span>
          </div>

          {/* Line items list */}
          <div className="divide-y divide-gray-200 max-h-[380px] overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="py-3.5 flex gap-3.5 items-start">
                <img
                  src={item.image}
                  alt={item.productName}
                  className="w-16 h-20 object-cover rounded border border-gray-300 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-black truncate">{item.productName}</h3>
                    <span className="font-bold text-black flex-shrink-0">
                      {settings.currency || '£'}
                      {(item.price * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-700 mt-0.5 space-y-0.5">
                    <div>Size: <span className="font-bold text-black">{item.size}</span> &nbsp;&bull;&nbsp; Qty: {item.quantity}</div>
                    {item.selectedOptions &&
                      Object.entries(item.selectedOptions).map(([k, v]) => (
                        <div key={k}>{k}: <span className="font-bold text-black">{v}</span></div>
                      ))}
                    {item.personalisationText && (
                      <div className="text-black font-medium truncate">
                        Personalisation: &ldquo;{item.personalisationText}&rdquo;
                      </div>
                    )}
                    {item.requirementsText && (
                      <div className="text-gray-700 truncate">
                        Note: &ldquo;{item.requirementsText}&rdquo;
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-2.5 pt-4 border-t border-gray-200 text-xs">
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Items Subtotal:</span>
              <span className="text-black font-bold">
                {settings.currency || '£'}
                {itemsSubtotal.toFixed(2)}
              </span>
            </div>

            {(itemsPersonalisationFee > 0 || itemsRequirementsFee > 0) && (
              <div className="flex justify-between text-gray-700">
                <span className="font-medium text-black">Custom Monogramming / Additions:</span>
                <span className="text-black font-bold">
                  {settings.currency || '£'}
                  {(itemsPersonalisationFee + itemsRequirementsFee).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Delivery ({selectedZone.name}):</span>
              <span className="text-black font-bold">
                {deliveryPrice === 0 ? 'FREE' : `${settings.currency || '£'}${deliveryPrice.toFixed(2)}`}
              </span>
            </div>

            <div className="flex justify-between text-base font-serif font-bold text-black pt-3 border-t border-gray-200">
              <span>Total Due:</span>
              <span className="text-black font-bold">
                {settings.currency || '£'}
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Guarantees Strip */}
          <div className="bg-gray-50 border border-gray-200 rounded p-3.5 space-y-2 text-[11px] text-gray-700">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>Handcrafted genuine leather tailored in our dedicated workshop.</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>Full insurance & tracking coordinates sent via email.</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span>Dedicated London customer care & fit assistance.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  return (
    <Elements stripe={getStripe()}>
      <CheckoutContent />
    </Elements>
  );
};

export default CheckoutPage;
