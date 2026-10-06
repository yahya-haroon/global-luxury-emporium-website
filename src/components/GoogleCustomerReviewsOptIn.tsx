import React, { useEffect, useRef } from 'react';
import { toIsoCountryCode, calculateEstimatedDeliveryDate } from '../lib/deliveryEstimate';

const GOOGLE_MERCHANT_ID = 5866639191;
const SCRIPT_ID = 'google-gcr-platform-script';
const SCRIPT_SRC = 'https://apis.google.com/js/platform.js?onload=renderOptIn';

// Global registry of order IDs already rendered to strictly prevent duplicate survey opt-in dialogs
// across fast re-renders, route re-entries, and React 18 StrictMode double-invocations.
const renderedOrdersRegistry = new Set<string>();

export interface GoogleCustomerReviewsOptInProps {
  orderId: string;
  email: string;
  deliveryCountry: string;
  estimatedDeliveryDate?: string;
  hasCustomization?: boolean;
  orderDate?: Date | string;
  merchantId?: number | string;
}

declare global {
  interface Window {
    gapi?: {
      surveyoptin?: {
        render: (config: {
          merchant_id: number | string;
          order_id: string;
          email: string;
          delivery_country: string;
          estimated_delivery_date: string;
          products?: Array<{ gtin: string }>;
          opt_in_style?: string;
        }) => void;
      };
      load?: (api: string, callback: () => void) => void;
    };
    renderOptIn?: () => void;
  }
}

export const GoogleCustomerReviewsOptIn: React.FC<GoogleCustomerReviewsOptInProps> = ({
  orderId,
  email,
  deliveryCountry,
  estimatedDeliveryDate,
  hasCustomization = false,
  orderDate,
  merchantId = GOOGLE_MERCHANT_ID,
}) => {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // 1. Strict validation: Must have valid order ID and email to invoke opt-in
    if (!orderId || !email || !email.includes('@')) {
      return;
    }

    // 2. StrictMode & duplicate guard: Check both ref and session-wide registry
    const normalizedOrderId = String(orderId).trim();
    if (hasTriggeredRef.current || renderedOrdersRegistry.has(normalizedOrderId)) {
      return;
    }

    // 3. Normalize ISO country code & estimated delivery date
    const isoCountry = toIsoCountryCode(deliveryCountry);
    const finalDeliveryDate =
      estimatedDeliveryDate ||
      calculateEstimatedDeliveryDate({
        orderDate,
        countryCode: isoCountry,
        hasCustomization,
      });

    const parsedMerchantId = Number(merchantId) || GOOGLE_MERCHANT_ID;

    // 4. Function that securely executes window.gapi.surveyoptin.render
    const executeOptIn = () => {
      if (hasTriggeredRef.current || renderedOrdersRegistry.has(normalizedOrderId)) {
        return;
      }

      if (window.gapi && typeof window.gapi.surveyoptin?.render === 'function') {
        try {
          window.gapi.surveyoptin.render({
            merchant_id: parsedMerchantId,
            order_id: normalizedOrderId,
            email: email.trim().toLowerCase(),
            delivery_country: isoCountry,
            estimated_delivery_date: finalDeliveryDate,
            opt_in_style: 'CENTER_DIALOG',
            // Note: products omitted because bespoke leather jackets do not carry GTIN barcodes
          });

          hasTriggeredRef.current = true;
          renderedOrdersRegistry.add(normalizedOrderId);
        } catch (err) {
          console.warn('[Google Customer Reviews] Failed to render opt-in survey:', err);
        }
      } else if (window.gapi && typeof window.gapi.load === 'function') {
        // In case platform.js is loaded but the surveyoptin module needs explicit initialization
        window.gapi.load('surveyoptin', () => {
          if (
            !hasTriggeredRef.current &&
            !renderedOrdersRegistry.has(normalizedOrderId) &&
            window.gapi?.surveyoptin?.render
          ) {
            try {
              window.gapi.surveyoptin.render({
                merchant_id: parsedMerchantId,
                order_id: normalizedOrderId,
                email: email.trim().toLowerCase(),
                delivery_country: isoCountry,
                estimated_delivery_date: finalDeliveryDate,
                opt_in_style: 'CENTER_DIALOG',
              });

              hasTriggeredRef.current = true;
              renderedOrdersRegistry.add(normalizedOrderId);
            } catch (err) {
              console.warn('[Google Customer Reviews] Failed to render opt-in survey after gapi.load:', err);
            }
          }
        });
      }
    };

    // 5. Expose the official callback for Google's platform.js
    window.renderOptIn = () => {
      executeOptIn();
    };

    // 6. Check if script is already present in document
    const existingScript = document.getElementById(SCRIPT_ID);

    if (existingScript) {
      // Script is already in the DOM, execute directly or when gapi is ready
      if (window.gapi?.surveyoptin?.render) {
        executeOptIn();
      } else {
        // Allow a short tick if the script tag was just inserted by another component
        const timer = setTimeout(executeOptIn, 300);
        return () => clearTimeout(timer);
      }
    } else {
      // 7. Inject Google's official platform.js script
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        executeOptIn();
      };
      script.onerror = () => {
        console.warn('[Google Customer Reviews] Failed to load platform.js script.');
      };

      document.head.appendChild(script);
    }
  }, [
    orderId,
    email,
    deliveryCountry,
    estimatedDeliveryDate,
    hasCustomization,
    orderDate,
    merchantId,
  ]);

  // Non-intrusive mounting container for accessibility and DOM compliance
  return <div id="gcr-optin-mount" aria-hidden="true" className="hidden" />;
};
