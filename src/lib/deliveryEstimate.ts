import { countryNameToIso2 } from './countryUtils';

/**
 * Converts any country display name or code into a verified ISO 3166-1 alpha-2 code.
 * Defaults to 'GB' (United Kingdom) if missing or unresolved.
 */
export function toIsoCountryCode(countryNameOrCode?: string): string {
  if (!countryNameOrCode) return 'GB';
  const trimmed = countryNameOrCode.trim();
  const iso2 = countryNameToIso2(trimmed);
  if (iso2 && iso2.length === 2) {
    return iso2.toUpperCase();
  }
  if (trimmed.length === 2) {
    return trimmed.toUpperCase();
  }
  return 'GB';
}

/**
 * Calculates an estimated delivery date in accordance with Global Luxury Emporium's
 * published bespoke tailoring and international courier schedules:
 * - Standard in-stock orders (UK destination): ~10 calendar days
 * - International destinations or bespoke custom-tailored / monogrammed orders: ~14 calendar days (1-2 weeks)
 *
 * Formatted strictly as YYYY-MM-DD required by Google Merchant Center Customer Reviews.
 */
export function calculateEstimatedDeliveryDate(options?: {
  orderDate?: Date | string;
  countryCode?: string;
  hasCustomization?: boolean;
}): string {
  const base = options?.orderDate ? new Date(options.orderDate) : new Date();
  const validBase = isNaN(base.getTime()) ? new Date() : base;

  const isoCode = toIsoCountryCode(options?.countryCode);
  const isUk = isoCode === 'GB';
  const hasCustom = Boolean(options?.hasCustomization);

  // UK standard: 10 calendar days; International or custom bespoke tailoring: 14 calendar days
  const daysToAdd = isUk && !hasCustom ? 10 : 14;

  const targetDate = new Date(validBase.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
