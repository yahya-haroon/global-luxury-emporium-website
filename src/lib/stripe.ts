import { Product, Settings } from '../types';

/**
 * Sanitise a string segment for Stripe client_reference_id.
 */
export function sanitizeReferenceSegment(
  text: string,
  maxLen: number
): string {
  if (!text) return '';

  return text
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen);
}

/**
 * Builds client_reference_id including size, dynamic options,
 * personalisation and requirements.
 */
export function buildClientReferenceId(
  size: string,
  personalisationText: string = '',
  requirementsText: string = '',
  selectedOptions: Record<string, string> = {}
): string {
  const cleanSize = sanitizeReferenceSegment(size, 12);
  const cleanText = sanitizeReferenceSegment(
    personalisationText,
    40
  );
  const cleanReq = sanitizeReferenceSegment(
    requirementsText,
    110
  );

  let ref = `size-${cleanSize}`;

  Object.entries(selectedOptions).forEach(
    ([name, value]) => {
      if (!value || !value.trim()) return;

      const cleanName = sanitizeReferenceSegment(
        name,
        18
      );

      const cleanValue = sanitizeReferenceSegment(
        value,
        28
      );

      if (cleanName && cleanValue) {
        ref += `__opt-${cleanName}_${cleanValue}`;
      }
    }
  );

  if (cleanText) {
    ref += `__text-${cleanText}`;
  }

  if (cleanReq) {
    ref += `__req-${cleanReq}`;
  }

  return ref.slice(0, 200);
}

export interface PaymentLinkResult {
  url?: string;
  error?: string;
  isAvailable: boolean;
}

/**
 * Resolves the Stripe Payment Link and includes
 * selected product options in client_reference_id.
 */
export function resolvePaymentLink(
  product: Product,
  settings: Settings,
  selectedSize: string,
  personalisationText: string = '',
  requirementsText: string = '',
  selectedOptions: Record<string, string> = {}
): PaymentLinkResult {
  if (!product.link || product.link.trim() === '') {
    return {
      isAvailable: false,
      error:
        'Card payment is not available for this jacket yet.',
    };
  }

  const pTextTrimmed = personalisationText.trim();
  const rTextTrimmed = requirementsText.trim();

  const fp = Boolean(
    settings.personalisation.enabled &&
      product.allow_personalisation &&
      settings.personalisation.charge &&
      pTextTrimmed.length > 0
  );

  const fr = Boolean(
    settings.requirements.enabled &&
      product.allow_requirements &&
      settings.requirements.charge &&
      rTextTrimmed.length > 0
  );

  let chosenUrl = '';

  if (fp && fr) {
    chosenUrl = product.link_pr || '';
  } else if (fp) {
    chosenUrl = product.link_p || '';
  } else if (fr) {
    chosenUrl = product.link_r || '';
  } else {
    chosenUrl = product.link || '';
  }

  if (!chosenUrl || chosenUrl.trim() === '') {
    return {
      isAvailable: false,
      error:
        'That option is not available for this jacket right now.',
    };
  }

  try {
    const urlObj = new URL(chosenUrl.trim());

    const clientRefId = buildClientReferenceId(
      selectedSize,
      pTextTrimmed,
      rTextTrimmed,
      selectedOptions
    );

    urlObj.searchParams.set(
      'client_reference_id',
      clientRefId
    );

    return {
      isAvailable: true,
      url: urlObj.toString(),
    };
  } catch (err) {
    console.error(
      'Invalid payment URL:',
      chosenUrl,
      err
    );

    return {
      isAvailable: false,
      error: 'Invalid payment link URL format.',
    };
  }
}