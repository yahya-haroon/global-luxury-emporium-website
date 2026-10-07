import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useData } from '../context/DataContext';
import { GoogleCustomerReviewsOptIn } from '../components/GoogleCustomerReviewsOptIn';
import { OrderAddress, CartItem } from '../types';
import { SEO } from '../components/SEO';
import {
  CheckCircle2,
  Copy,
  Check,
  Truck,
  ExternalLink,
  ShoppingBag,
} from 'lucide-react';

interface VerifiedOrderDetails {
  orderId: string;
  customerName: string;
  email: string;
  address: OrderAddress;
  deliveryZoneName: string;
  deliveryPrice: number;
  totalAmount: number;
  currency: string;
  items: CartItem[];
  hasCustomization: boolean;
  createdAt?: string;
}

export const OrderConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { settings } = useData();

  const [order, setOrder] = useState<VerifiedOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedOrderId, setCopiedOrderId] = useState(false);

  useEffect(() => {
    const urlOrderId = searchParams.get('order_id')?.trim();

    // 1. Check current browser session first (tamper-proof for the customer who just completed purchase)
    try {
      const cached = sessionStorage.getItem('gle_completed_order');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.orderId) {
          // If a URL order_id is provided, verify it matches the current customer's session
          if (!urlOrderId || parsed.orderId === urlOrderId) {
            const hasCustom =
              Array.isArray(parsed.items) &&
              parsed.items.some(
                (item: any) =>
                  Boolean(item.personalisationText || item.requirementsText)
              );

            setOrder({
              orderId: parsed.orderId,
              customerName: parsed.customerName || 'Valued Client',
              email: parsed.email || '',
              address: parsed.address || {
                line1: '',
                city: '',
                postal_code: '',
                country: 'United Kingdom',
              },
              deliveryZoneName: parsed.deliveryZoneName || 'Standard Delivery',
              deliveryPrice: Number(parsed.deliveryPrice || 0),
              totalAmount: Number(parsed.totalAmount || 0),
              currency: parsed.currency || settings.currency || '£',
              items: Array.isArray(parsed.items) ? parsed.items : [],
              hasCustomization: hasCustom,
              createdAt: parsed.completedAt,
            });
            setIsLoading(false);
            return;
          }
        }
      }
    } catch {
      // sessionStorage failure fallback
    }

    // 2. If urlOrderId exists but no local session matches, securely validate against Supabase
    //    We NEVER trust URL parameters blindly and only accept orders with verified paid status.
    if (urlOrderId && isSupabaseConfigured) {
      (async () => {
        try {
          const { data, error } = await supabase
            .rpc('validate_order_for_confirmation', { p_order_id: urlOrderId });

          if (!error && Array.isArray(data) && data.length > 0) {
            const row = data[0];
            setOrder({
              orderId: row.id,
              customerName: 'Valued Client',
              email: row.email,
              address: {
                line1: '',
                city: '',
                postal_code: '',
                country: row.country || 'United Kingdom',
              },
              deliveryZoneName: 'Express Tracked Delivery',
              deliveryPrice: 0,
              totalAmount: 0,
              currency: settings.currency || '£',
              items: [],
              hasCustomization: Boolean(row.has_customization),
              createdAt: row.created_at,
            });
          } else {
            setOrder(null);
          }
        } catch {
          setOrder(null);
        } finally {
          setIsLoading(false);
        }
      })();
    } else {
      setIsLoading(false);
    }
  }, [searchParams, settings.currency]);

  const handleCopyOrderId = () => {
    if (!order?.orderId) return;
    navigator.clipboard.writeText(order.orderId);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-ivory">
        <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
      </div>
    );
  }

  // If no legitimate or paid order is identified, do NOT show opt-in or order details
  if (!order || !order.orderId || !order.email) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <SEO
          title="Order Confirmation | Global Luxury Emporium"
          description="Global Luxury Emporium order status and confirmation."
          canonical="/order-confirmation"
        />
        <div className="w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center mx-auto mb-4 text-black shadow-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl text-black font-semibold mb-2">
          No Recent Order Found
        </h1>
        <p className="text-xs sm:text-sm text-gray-700 max-w-md mx-auto mb-6 font-normal">
          If you recently completed an order, please refer to your confirmation email for tracking coordinates,
          or contact our concierge support on WhatsApp.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-gold text-xs py-3 px-8 font-bold text-black"
        >
          Return to Store
        </button>
      </div>
    );
  }

  const whatsappText = encodeURIComponent(
    `Hello Global Luxury Emporium, I have placed Order #${order.orderId} for bespoke tailoring. My name is ${order.customerName}.`
  );
  const whatsappUrl = `https://wa.me/${(settings.whatsapp || '+923278434142').replace(/\+/g, '')}?text=${whatsappText}`;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center animate-fade-in">
      <SEO
        title="Order Confirmed | Global Luxury Emporium"
        description="Your handcrafted bespoke leather order has been received and confirmed."
        canonical="/order-confirmation"
      />

      {/* Official Google Customer Reviews Opt-In (invoked only for genuine, successfully completed orders) */}
      <GoogleCustomerReviewsOptIn
        orderId={order.orderId}
        email={order.email}
        deliveryCountry={order.address.country}
        hasCustomization={order.hasCustomization}
        orderDate={order.createdAt}
      />

      <div className="w-16 h-16 bg-black text-gold rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <span className="uppercase tracking-[0.24em] text-black block mb-2 font-bold text-xs">
        Order Successfully Placed
      </span>
      <h1 className="font-serif text-3xl sm:text-4xl text-black font-semibold mb-3">
        Thank you, {order.customerName}
      </h1>
      <p className="text-gray-700 text-sm max-w-md mx-auto mb-8 font-normal leading-relaxed">
        Your bespoke order has been confirmed. A receipt and confirmation have been sent to{' '}
        <strong className="text-black font-bold">{order.email}</strong>.
      </p>

      {/* Order Reference Box */}
      <div className="bg-white border border-gray-300 rounded-lg p-5 sm:p-6 mb-8 text-left shadow-sm max-w-xl mx-auto">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-black font-bold block">
              Order Reference
            </span>
            <span className="font-mono text-base font-bold text-black">
              #{order.orderId}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 border border-gray-300 hover:border-black text-black font-medium"
            title="Copy Order ID"
          >
            {copiedOrderId ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-black" />
            )}
            <span>{copiedOrderId ? 'Copied' : 'Copy ID'}</span>
          </button>
        </div>

        <div className="space-y-3 text-xs">
          {order.items.length > 0 && (
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Items Ordered:</span>
              <span className="text-black font-bold">{order.items.length} piece(s)</span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span className="font-medium text-black">Delivery Method:</span>
            <span className="text-black font-bold">{order.deliveryZoneName}</span>
          </div>
          {order.deliveryPrice === 0 && (
            <div className="flex justify-between text-gray-700">
              <span className="font-medium text-black">Delivery Charge:</span>
              <span className="text-emerald-700 font-bold">
                {order.deliveryZoneName.toLowerCase().includes('repeat') || order.deliveryZoneName.toLowerCase().includes('vip')
                  ? 'FREE (Repeat Client Privilege)'
                  : 'FREE (Complimentary)'}
              </span>
            </div>
          )}
          <div className="flex justify-between text-gray-700">
            <span className="font-medium text-black">Destination:</span>
            <span className="text-black font-bold text-right truncate max-w-[240px]">
              {order.address.city ? `${order.address.city}, ` : ''}{order.address.country}
            </span>
          </div>
          {order.totalAmount > 0 && (
            <div className="flex justify-between text-gray-700 pt-2 border-t border-gray-200 text-sm font-bold text-black">
              <span>Total Paid:</span>
              <span className="text-black">
                {order.currency}
                {order.totalAmount.toFixed(2)}
              </span>
            </div>
          )}
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
};
