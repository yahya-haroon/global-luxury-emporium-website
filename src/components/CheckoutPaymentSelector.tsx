import React, { useEffect, useRef, useState } from 'react';
import {
  loadPayPalV6Sdk,
  fetchPayPalClientToken,
  toIsoCurrency,
  PayPalFundingSource,
} from '../lib/paypal';
import { Loader2, ShieldCheck, Lock, CreditCard, Calendar, KeyRound, AlertCircle } from 'lucide-react';
import { OrderAddress } from '../types';

export type PaymentMethodType = 'paypal_card' | 'paypal' | 'paylater' | 'stripe' | 'card';

interface CheckoutPaymentSelectorProps {
  selectedMethod: PaymentMethodType;
  onSelectMethod: (method: PaymentMethodType) => void;
  totalAmount?: number;
  currency?: string;
  clientId?: string;
  customerName?: string;
  address?: OrderAddress;
  onValidate: () => boolean;
  onCreateServerOrder: (fundingSource: PayPalFundingSource) => Promise<string>;
  onCaptureServerOrder: (paypalOrderId: string, fundingSource: PayPalFundingSource) => Promise<void>;
  onPayPalError?: (err: any) => void;
  disabled?: boolean;
}

/**
 * High-definition credit & debit card logos matching official brand specifications
 */
export const PaymentBrandBadges: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap ${className}`}>
      {/* 1. Mastercard */}
      <div
        className="h-7 px-2.5 bg-white border border-gray-300 rounded flex items-center justify-center shadow-xs"
        title="Mastercard accepted"
      >
        <svg className="h-4 w-7" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" fill="#EB001B" />
          <circle cx="24" cy="12" r="9" fill="#F79E1B" fillOpacity="0.95" />
          <path
            d="M18 5.75A8.97 8.97 0 0 1 21.3 12 8.97 8.97 0 0 1 18 18.25 8.97 8.97 0 0 1 14.7 12 8.97 8.97 0 0 1 18 5.75Z"
            fill="#FF5F00"
          />
        </svg>
      </div>

      {/* 2. VISA */}
      <div
        className="h-7 px-2.5 bg-white border border-gray-300 rounded flex items-center justify-center shadow-xs"
        title="Visa accepted"
      >
        <span
          className="font-serif font-black italic text-sm tracking-widest text-[#1434CB] select-none"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          VISA
        </span>
      </div>

      {/* 3. Discover */}
      <div
        className="h-7 px-2 bg-white border border-gray-300 rounded flex items-center justify-center shadow-xs"
        title="Discover accepted"
      >
        <div className="flex items-center text-[10px] font-extrabold tracking-tight text-[#231F20] select-none">
          <span>DISC</span>
          <span className="w-2.5 h-2.5 bg-[#FF6000] rounded-full mx-0.5 inline-block" />
          <span>VER</span>
        </div>
      </div>

      {/* 4. American Express */}
      <div
        className="h-7 px-2 bg-[#006FCF] rounded flex items-center justify-center shadow-xs"
        title="American Express accepted"
      >
        <span className="text-[10px] font-black tracking-tighter text-white select-none">
          AMEX
        </span>
      </div>

      {/* 5. Google Pay */}
      <div
        className="h-7 px-2.5 bg-white border border-gray-300 rounded flex items-center justify-center shadow-xs"
        title="Google Pay accepted"
      >
        <div className="flex items-center gap-0.5 text-xs font-semibold text-gray-700 select-none">
          <span className="font-bold text-[#4285F4]">G</span>
          <span className="text-gray-600 text-[11px] font-medium ml-0.5">Pay</span>
        </div>
      </div>

      {/* 6. Apple Pay */}
      <div
        className="h-7 px-2.5 bg-black rounded flex items-center justify-center shadow-xs"
        title="Apple Pay accepted"
      >
        <div className="flex items-center gap-0.5 text-white text-[11px] font-medium select-none">
          <svg className="w-2.5 h-3 fill-current" viewBox="0 0 170 170">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.85-12.01-14.44-5.96-9.13-10.6-19.46-13.91-30.98-3.32-11.53-4.98-22.3-4.98-32.32 0-14.54 3.73-26.44 11.2-35.68 7.47-9.24 16.66-13.94 27.56-14.1 4.57 0 9.77 1.25 15.6 3.76 5.83 2.5 9.7 3.82 11.62 3.94 1.44-.12 5.56-1.5 12.37-4.14 6.8-2.65 12.08-3.8 15.82-3.46 11.85 1.07 21.05 5.63 27.6 13.68-10.43 6.36-15.54 15.22-15.34 26.58.2 8.97 3.65 16.48 10.37 22.52 6.71 6.04 14.62 9.53 23.72 10.47-2.12 6.52-4.63 12.51-7.53 17.99z" />
          </svg>
          <span className="font-semibold text-xs ml-0.5">Pay</span>
        </div>
      </div>
    </div>
  );
};

export const PayPalIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M7.076 21.337H2.47a.64.64 0 0 1-.633-.74l3.19-20.218A.799.799 0 0 1 5.817 0h7.337c3.38 0 6.044.838 6.945 3.957.477 1.65.253 3.398-.632 4.922-1.078 1.854-2.868 2.898-5.323 3.102l-.658.056-.99 6.275a.798.798 0 0 1-.79.675H7.076z"
      fill="#003087"
    />
    <path
      d="M8.887 18.067h3.19a.798.798 0 0 0 .79-.675l.99-6.275.658-.056c2.455-.204 4.245-1.248 5.323-3.102.885-1.524 1.109-3.272.632-4.922C19.57 6.156 16.906 7 13.526 7H7.708l-2.072 13.14a.798.798 0 0 0 .788.927h2.463z"
      fill="#0079C1"
    />
    <path
      d="M19.57 3.957C18.669.838 16.005 0 12.625 0H5.817a.799.799 0 0 0-.79.679L1.837 20.897a.64.64 0 0 0 .633.74h4.606l1.811-11.488a.798.798 0 0 1 .79-.675h2.849c3.38 0 6.044-.844 6.945-3.963.037-.129.068-.258.099-.387-.03.129-.062.258-.099.387z"
      fill="#00457C"
    />
  </svg>
);

export const PayPalWordmark: React.FC<{ className?: string }> = ({ className = 'h-5' }) => (
  <div className={`flex items-center gap-1 font-bold tracking-tight select-none ${className}`}>
    <PayPalIcon className="w-5 h-5 flex-shrink-0" />
    <span className="text-[#003087] text-xl sm:text-2xl leading-none">Pay</span>
    <span className="text-[#0079C1] text-xl sm:text-2xl leading-none">Pal</span>
  </div>
);

export const CheckoutPaymentSelector: React.FC<CheckoutPaymentSelectorProps> = ({
  selectedMethod,
  onSelectMethod,
  totalAmount = 0,
  currency = '£',
  clientId,
  customerName = '',
  address,
  onValidate,
  onCreateServerOrder,
  onCaptureServerOrder,
  onPayPalError,
  disabled = false,
}) => {
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paylaterContainerRef = useRef<HTMLDivElement>(null);
  const cardNumberContainerRef = useRef<HTMLDivElement>(null);
  const cardExpiryContainerRef = useRef<HTMLDivElement>(null);
  const cardCvvContainerRef = useRef<HTMLDivElement>(null);

  const cardSessionRef = useRef<any>(null);

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [isPayLaterEligible, setIsPayLaterEligible] = useState<boolean>(false);
  const [payLaterChecked, setPayLaterChecked] = useState<boolean>(false);
  const [isPayPalCardEligible, setIsPayPalCardEligible] = useState<boolean>(false);
  const [isProcessingPayPalCard, setIsProcessingPayPalCard] = useState<boolean>(false);
  const [payPalCardError, setPayPalCardError] = useState<string | null>(null);

  // References to keep callbacks and totals fresh without re-triggering SDK reload
  const totalAmountRef = useRef(totalAmount);
  totalAmountRef.current = totalAmount;

  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  const customerNameRef = useRef(customerName);
  customerNameRef.current = customerName;

  const addressRef = useRef(address);
  addressRef.current = address;

  const onValidateRef = useRef(onValidate);
  onValidateRef.current = onValidate;

  const onCreateServerOrderRef = useRef(onCreateServerOrder);
  onCreateServerOrderRef.current = onCreateServerOrder;

  const onCaptureServerOrderRef = useRef(onCaptureServerOrder);
  onCaptureServerOrderRef.current = onCaptureServerOrder;

  const onPayPalErrorRef = useRef(onPayPalError);
  onPayPalErrorRef.current = onPayPalError;

  const activeClientId = clientId?.trim() || import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test';
  const isoCurrency = toIsoCurrency(currency);

  // Initialize and mount PayPal Web SDK v6
  useEffect(() => {
    let isCancelled = false;

    async function initPayPalV6() {
      try {
        console.log('[PayPal v6] Fetching client token for Advanced Card Payments...');
        let clientToken: string | null = null;
        try {
          clientToken = await fetchPayPalClientToken();
          if (clientToken) {
            console.log('[PayPal v6] Received client token from backend');
          } else {
            console.log('[PayPal v6] Client token not returned by backend; Advanced Cards will be evaluated through SDK');
          }
        } catch (tokenErr) {
          console.warn('[PayPal v6] Client token request note:', tokenErr);
        }

        if (isCancelled) return;

        console.log('[PayPal v6] Loading official SDK v6 Core...');
        const sdkInstance = await loadPayPalV6Sdk(activeClientId, isoCurrency, clientToken);
        if (isCancelled || !sdkInstance) return;

        setSdkLoaded(true);
        setSdkError(null);

        // 1. Query eligibility via findEligibleMethods() for current GBP transaction
        const amountString = totalAmountRef.current > 0 ? totalAmountRef.current.toFixed(2) : '100.00';
        console.log('[PayPal v6] Calling findEligibleMethods for GBP transaction:', {
          currencyCode: isoCurrency,
          amount: amountString,
          countryCode: 'GB',
        });

        let eligibility: any = null;
        try {
          eligibility = await sdkInstance.findEligibleMethods({
            currencyCode: isoCurrency,
            amount: amountString,
            countryCode: 'GB',
          });
          console.log('[PayPal v6] Raw findEligibleMethods response:', eligibility);
        } catch (eligErr) {
          console.warn('[PayPal v6] findEligibleMethods call warning:', eligErr);
        }

        // 2. Check Pay Later eligibility using eligibility.isEligible("paylater")
        let eligibleForPayLater = false;
        let payLaterDetails: { productCode?: string; countryCode?: string } | null = null;

        if (eligibility && typeof eligibility.isEligible === 'function') {
          eligibleForPayLater = Boolean(eligibility.isEligible('paylater'));
          console.log('[PayPal v6] eligibility.isEligible("paylater"):', eligibleForPayLater);

          if (eligibleForPayLater && typeof eligibility.getDetails === 'function') {
            payLaterDetails = eligibility.getDetails('paylater');
            console.log('[PayPal v6] eligibility.getDetails("paylater"):', payLaterDetails);
          }
        } else if (eligibility && typeof eligibility.paylater !== 'undefined') {
          eligibleForPayLater = Boolean(eligibility.paylater);
        }

        // 3. Check Advanced Card Payments eligibility using paymentMethods.isEligible("advanced_cards")
        let eligibleForCard = false;
        if (clientToken && typeof sdkInstance.createCardFieldsOneTimePaymentSession === 'function') {
          try {
            if (eligibility && typeof eligibility.isEligible === 'function') {
              eligibleForCard = Boolean(eligibility.isEligible('advanced_cards'));
            }
          } catch (cErr) {
            console.warn('[PayPal v6] isEligible("advanced_cards") check error:', cErr);
          }
        }
        console.log('[PayPal v6] paymentMethods.isEligible("advanced_cards"):', eligibleForCard);

        if (isCancelled) return;
        setIsPayLaterEligible(eligibleForPayLater);
        setPayLaterChecked(true);
        setIsPayPalCardEligible(eligibleForCard);

        // 4. Create Standard PayPal One-Time Payment Session
        let paypalSession: any = null;
        if (typeof sdkInstance.createPayPalOneTimePaymentSession === 'function') {
          paypalSession = sdkInstance.createPayPalOneTimePaymentSession({
            onApprove: async (data: any) => {
              console.log('[PayPal v6] Standard PayPal approved:', data);
              const approvedOrderId = data?.orderId || data?.orderID;
              if (!approvedOrderId) {
                throw new Error('No orderId received upon PayPal approval');
              }
              await onCaptureServerOrderRef.current(approvedOrderId, 'paypal');
            },
            onCancel: (data: any) => {
              console.log('[PayPal v6] Standard PayPal checkout cancelled by user:', data);
            },
            onError: (err: any) => {
              console.error('[PayPal v6] Standard PayPal session error:', err);
              onPayPalErrorRef.current?.(err);
            },
          });
        }

        // 5. Create Pay Later One-Time Payment Session if eligible
        let payLaterSession: any = null;
        if (eligibleForPayLater && typeof sdkInstance.createPayLaterOneTimePaymentSession === 'function') {
          payLaterSession = sdkInstance.createPayLaterOneTimePaymentSession({
            onApprove: async (data: any) => {
              console.log('[PayPal v6] Pay Later approved:', data);
              const approvedOrderId = data?.orderId || data?.orderID;
              if (!approvedOrderId) {
                throw new Error('No orderId received upon Pay Later approval');
              }
              await onCaptureServerOrderRef.current(approvedOrderId, 'paylater');
            },
            onCancel: (data: any) => {
              console.log('[PayPal v6] Pay Later checkout cancelled by user:', data);
            },
            onError: (err: any) => {
              console.error('[PayPal v6] Pay Later session error:', err);
              onPayPalErrorRef.current?.(err);
            },
          });
        }

        // 6. Create PayPal Advanced Card Fields Session if eligible
        if (eligibleForCard && typeof sdkInstance.createCardFieldsOneTimePaymentSession === 'function') {
          try {
            const cardSession = sdkInstance.createCardFieldsOneTimePaymentSession();
            cardSessionRef.current = cardSession;
            console.log('[PayPal v6] Created Card Fields One-Time Payment Session');
          } catch (sessionErr) {
            console.warn('[PayPal v6] Failed to initialize card fields session:', sessionErr);
            setIsPayPalCardEligible(false);
          }
        }

        // 7. Mount official <paypal-button> component
        if (paypalContainerRef.current) {
          paypalContainerRef.current.innerHTML = '';
          const paypalBtn = document.createElement('paypal-button') as any;
          paypalBtn.setAttribute('type', 'pay');
          paypalBtn.style.display = 'block';
          paypalBtn.style.width = '100%';
          paypalBtn.style.cursor = 'pointer';

          paypalBtn.addEventListener('click', async (e: Event) => {
            e.preventDefault();
            onSelectMethod('paypal');
            if (!onValidateRef.current()) return;

            try {
              console.log('[PayPal v6] Standard PayPal button clicked, initiating order on server...');
              const orderPromise = onCreateServerOrderRef.current('paypal')
                .then((orderId) => ({ orderId }));

              if (paypalSession && typeof paypalSession.start === 'function') {
                await paypalSession.start({ presentationMode: 'auto' }, orderPromise);
              } else {
                const { orderId } = await orderPromise;
                console.log('[PayPal v6] Fallback opening PayPal checkout window for order:', orderId);
              }
            } catch (err: any) {
              console.error('[PayPal v6] Standard PayPal session start error:', err);
              onPayPalErrorRef.current?.(err);
            }
          });

          paypalContainerRef.current.appendChild(paypalBtn);
        }

        // 8. Mount official <paypal-pay-later-button> component if eligible
        if (paylaterContainerRef.current) {
          paylaterContainerRef.current.innerHTML = '';

          if (eligibleForPayLater) {
            const payLaterBtn = document.createElement('paypal-pay-later-button') as any;

            // Configure productCode and countryCode from eligibility details
            const countryCode = payLaterDetails?.countryCode || 'GB';
            const productCode = payLaterDetails?.productCode || 'PAYLATER';
            payLaterBtn.countryCode = countryCode;
            payLaterBtn.productCode = productCode;
            payLaterBtn.setAttribute('country-code', countryCode);
            payLaterBtn.setAttribute('product-code', productCode);
            payLaterBtn.style.display = 'block';
            payLaterBtn.style.width = '100%';
            payLaterBtn.style.cursor = 'pointer';

            payLaterBtn.addEventListener('click', async (e: Event) => {
              e.preventDefault();
              onSelectMethod('paylater');
              if (!onValidateRef.current()) return;

              try {
                console.log('[PayPal v6] Pay Later button clicked, initiating order on server...');
                const orderPromise = onCreateServerOrderRef.current('paylater')
                  .then((orderId) => ({ orderId }));

                if (payLaterSession && typeof payLaterSession.start === 'function') {
                  await payLaterSession.start({ presentationMode: 'auto' }, orderPromise);
                } else {
                  const { orderId } = await orderPromise;
                  console.log('[PayPal v6] Fallback opening Pay Later window for order:', orderId);
                }
              } catch (err: any) {
                console.error('[PayPal v6] Pay Later session start error:', err);
                onPayPalErrorRef.current?.(err);
              }
            });

            paylaterContainerRef.current.appendChild(payLaterBtn);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[PayPal v6] SDK initialization or eligibility failure:', err);
          setSdkError(err.message || 'PayPal service could not be reached');
          setPayLaterChecked(true);
        }
      }
    }

    initPayPalV6();

    return () => {
      isCancelled = true;
    };
  }, [activeClientId, isoCurrency]);

  // Mount PayPal Hosted Card Fields into containers when PayPal Card is selected and session is ready
  useEffect(() => {
    if (!isPayPalCardEligible || selectedMethod !== 'paypal_card' || !cardSessionRef.current) {
      return;
    }

    if (
      cardNumberContainerRef.current &&
      cardExpiryContainerRef.current &&
      cardCvvContainerRef.current
    ) {
      try {
        cardNumberContainerRef.current.innerHTML = '';
        cardExpiryContainerRef.current.innerHTML = '';
        cardCvvContainerRef.current.innerHTML = '';

        const cardStyle = {
          input: {
            'font-size': '15px',
            'font-family': "'Jost', system-ui, -apple-system, sans-serif",
            'font-weight': '500',
            color: '#000000',
          },
        };

        const numberField = cardSessionRef.current.createCardFieldsComponent({
          type: 'number',
          placeholder: '•••• •••• •••• ••••',
          style: cardStyle,
        });

        const expiryField = cardSessionRef.current.createCardFieldsComponent({
          type: 'expiry',
          placeholder: 'MM / YY',
          style: cardStyle,
        });

        const cvvField = cardSessionRef.current.createCardFieldsComponent({
          type: 'cvv',
          placeholder: 'CVV',
          style: cardStyle,
        });

        cardNumberContainerRef.current.appendChild(numberField);
        cardExpiryContainerRef.current.appendChild(expiryField);
        cardCvvContainerRef.current.appendChild(cvvField);
        console.log('[PayPal v6] Hosted card fields mounted into DOM');
      } catch (err) {
        console.error('[PayPal v6] Error mounting card fields into DOM:', err);
      }
    }
  }, [selectedMethod, isPayPalCardEligible]);

  // Handler for PayPal Advanced Card Payment submission with 3DS/SCA support
  const handlePayWithPayPalCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onValidateRef.current()) return;
    if (isProcessingPayPalCard || disabled) return;

    setIsProcessingPayPalCard(true);
    setPayPalCardError(null);

    try {
      console.log('[PayPal v6] Creating PayPal order for Advanced Card payment...');
      const paypalOrderId = await onCreateServerOrderRef.current('paypal_card');
      if (!paypalOrderId) {
        throw new Error('Could not initialize payment order on server.');
      }

      if (!cardSessionRef.current) {
        throw new Error('PayPal card session is not ready. Please try again.');
      }

      const submitPayload: any = {
        cardholderName: customerNameRef.current || undefined,
      };

      if (addressRef.current?.line1) {
        const addr = addressRef.current;
        const countryCode = (addr.country === 'United Kingdom' || addr.country === 'UK')
          ? 'GB'
          : (addr.country === 'United States' || addr.country === 'USA')
          ? 'US'
          : 'GB';

        submitPayload.billingAddress = {
          addressLine1: addr.line1,
          adminArea2: addr.city,
          postalCode: addr.postal_code || undefined,
          countryCode,
        };
      }

      console.log('[PayPal v6] Submitting card details to PayPal via cardSession.submit()...');
      // Submits card and handles 3D Secure / SCA contingencies automatically
      const submitResult = await cardSessionRef.current.submit(paypalOrderId, submitPayload);
      console.log('[PayPal v6] Card authorization succeeded:', submitResult);

      // Verify and capture securely server-side
      await onCaptureServerOrderRef.current(paypalOrderId, 'paypal_card');
    } catch (err: any) {
      console.error('[PayPal v6] Card payment submission error:', err);
      const userMessage =
        err?.message ||
        'Card payment could not be completed. Please check your card details and try again.';
      setPayPalCardError(userMessage);
      onPayPalErrorRef.current?.(err);
    } finally {
      setIsProcessingPayPalCard(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto w-full">
      {/* 1. OFFICIAL PAYPAL BUTTON */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-black block">
              PayPal
            </span>
            <span className="text-[11px] text-gray-500 font-normal">
              Pay securely with PayPal
            </span>
          </div>
          <PayPalWordmark className="h-4" />
        </div>

        <div className="relative min-h-[48px] rounded-md overflow-hidden">
          {/* Real PayPal JS SDK Mount Target */}
          <div
            ref={paypalContainerRef}
            id="paypal-button-standard-mount"
            className="w-full relative z-10"
          />

          {!sdkLoaded && !sdkError && (
            <div className="w-full h-12 bg-[#FFC439] rounded-md flex items-center justify-center gap-2 shadow-sm text-black">
              <Loader2 className="w-4 h-4 animate-spin text-[#003087]" />
              <PayPalWordmark className="h-5" />
            </div>
          )}

          {sdkError && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-center text-xs text-gray-600">
              <span>PayPal checkout service is currently unavailable. Please use Debit or Credit Card below.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. OFFICIAL PAYPAL PAY LATER BUTTON (ONLY WHEN ELIGIBLE) */}
      {isPayLaterEligible && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-black block">
                Pay Later
              </span>
              <span className="text-[11px] text-gray-500 font-normal">
                Pay with PayPal Pay Later
              </span>
            </div>
            <span className="text-[10px] font-bold bg-[#FFC439]/30 text-[#003087] px-2 py-0.5 rounded border border-[#FFC439]/60">
              0% Interest
            </span>
          </div>

          <div
            ref={paylaterContainerRef}
            id="paypal-button-paylater-mount"
            className="w-full relative z-10 min-h-[48px]"
          />
        </div>
      )}

      {/* Loading state for Pay Later while checking eligibility */}
      {!payLaterChecked && !sdkError && (
        <div className="w-full h-12 bg-[#FFC439]/40 border border-[#FFC439]/60 rounded-md flex items-center justify-center gap-2 shadow-sm">
          <Loader2 className="w-4 h-4 animate-spin text-[#003087]" />
          <span className="text-xs font-bold text-[#003087]">Checking Pay Later eligibility...</span>
        </div>
      )}

      {/* 3. PAYPAL ADVANCED CREDIT / DEBIT CARD OPTION (ONLY RENDERED WHEN isEligible("advanced_cards") === true) */}
      {isPayPalCardEligible && (
        <div className="pt-2 border-t border-gray-200 space-y-3 animate-fade-in">
          <button
            type="button"
            disabled={disabled || isProcessingPayPalCard}
            onClick={() => onSelectMethod('paypal_card')}
            className={`w-full py-3.5 px-6 rounded-md font-medium text-base sm:text-lg flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm ${
              selectedMethod === 'paypal_card'
                ? 'bg-[#1e2329] text-white ring-2 ring-offset-2 ring-black'
                : 'bg-[#2b313a] hover:bg-[#1e2329] text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-white flex-shrink-0" />
              <div className="text-left">
                <span className="tracking-wide font-normal block leading-tight">Credit / Debit Card</span>
                <span className="text-[11px] text-gray-300 font-normal block">
                  Secure card payment powered by PayPal
                </span>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'paypal_card' ? 'border-white bg-white' : 'border-gray-400 bg-transparent'
              }`}
            >
              {selectedMethod === 'paypal_card' && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#1e2329]" />
              )}
            </div>
          </button>

          {/* Accepted card logos */}
          <div className="mt-2.5">
            <PaymentBrandBadges />
          </div>

          {/* PayPal Hosted Card Fields Form */}
          {selectedMethod === 'paypal_card' && (
            <form
              onSubmit={handlePayWithPayPalCard}
              className="mt-4 p-5 bg-gray-50 border border-gray-200 rounded-lg space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                <span className="text-xs uppercase tracking-wider font-bold text-black flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-black" />
                  <span>Card Details</span>
                </span>
                <span className="text-[11px] text-gray-500 font-normal">
                  Powered by PayPal ACDC
                </span>
              </div>

              {/* CARD NUMBER CONTAINER */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-black" />
                    <span>Card Number</span>
                  </span>
                  <span className="text-red-500">*</span>
                </label>
                <div
                  ref={cardNumberContainerRef}
                  id="paypal-card-number-container"
                  className="h-12 w-full bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm flex items-center px-3"
                />
              </div>

              {/* EXPIRY & CVV CONTAINERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-black" />
                      <span>Expiry Date</span>
                    </span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div
                    ref={cardExpiryContainerRef}
                    id="paypal-card-expiry-container"
                    className="h-12 w-full bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm flex items-center px-3"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-black mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-black" />
                      <span>CVV / CVC</span>
                    </span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div
                    ref={cardCvvContainerRef}
                    id="paypal-card-cvv-container"
                    className="h-12 w-full bg-white border border-gray-300 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all shadow-sm flex items-center px-3"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-700 font-normal pt-1">
                <Lock className="w-3.5 h-3.5 text-black flex-shrink-0" />
                <span>Your card payment is securely processed by PayPal.</span>
              </div>

              {/* Error banner */}
              {payPalCardError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{payPalCardError}</span>
                </div>
              )}

              {/* Pay Button for PayPal Card */}
              <div>
                <button
                  type="submit"
                  disabled={isProcessingPayPalCard || disabled}
                  className="btn-gold w-full py-4 text-sm font-bold tracking-wider uppercase flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingPayPalCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      <span>Authorising Secure Card Payment...</span>
                    </>
                  ) : (
                    <span>
                      Pay {currency}{totalAmount.toFixed(2)} &nbsp;&bull;&nbsp; Complete Order
                    </span>
                  )}
                </button>

                <p className="text-center text-[11px] text-gray-600 mt-2.5 font-normal">
                  By clicking complete order, your card will be charged{' '}
                  <strong className="text-black font-bold">
                    {currency}{totalAmount.toFixed(2)}
                  </strong>
                  .
                </p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 4. STRIPE CARD FALLBACK GATEWAY (ALWAYS INTACT & FUNCTIONAL) */}
      <div className="pt-2 border-t border-gray-200 space-y-2">
        <button
          type="button"
          disabled={disabled || isProcessingPayPalCard}
          onClick={() => onSelectMethod('stripe')}
          className={`w-full py-3 px-5 rounded-md font-medium text-sm sm:text-base flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm ${
            selectedMethod === 'stripe' || selectedMethod === 'card'
              ? 'bg-[#1e2329] text-white ring-2 ring-offset-2 ring-black'
              : 'bg-white border border-gray-300 hover:border-black text-gray-900'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 flex-shrink-0" />
            <div className="text-left">
              <span className="tracking-wide font-medium block leading-tight">
                {isPayPalCardEligible ? 'Alternative Card Checkout (Stripe)' : 'Debit Or Credit Card'}
              </span>
              <span
                className={`text-[11px] block font-normal ${
                  selectedMethod === 'stripe' || selectedMethod === 'card' ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                {isPayPalCardEligible ? 'Processed securely via Stripe' : 'Encrypted 256-bit card checkout'}
              </span>
            </div>
          </div>
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedMethod === 'stripe' || selectedMethod === 'card'
                ? 'border-white bg-white'
                : 'border-gray-400 bg-transparent'
            }`}
          >
            {(selectedMethod === 'stripe' || selectedMethod === 'card') && (
              <div className="w-2.5 h-2.5 rounded-full bg-[#1e2329]" />
            )}
          </div>
        </button>

        {!isPayPalCardEligible && (
          <div className="mt-2">
            <PaymentBrandBadges />
          </div>
        )}
      </div>

      {/* REASSURANCE STRIP */}
      <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500 font-normal pt-2">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-black" />
          Official Buyer Protection
        </span>
        <span>&bull;</span>
        <span className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5 text-black" />
          256-Bit SSL Encrypted
        </span>
      </div>
    </div>
  );
};
