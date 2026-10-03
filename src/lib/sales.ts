import { Sale, SaleStatus, ProductSaleCalculation } from '../types';

/**
 * Calculates the current real-time status of a sale based on its
 * start/end timestamps and its enabled/active toggle.
 */
export function getSaleStatus(sale: Sale, now = new Date()): SaleStatus {
  if (!sale.is_active) {
    return 'disabled';
  }

  const startTime = new Date(sale.starts_at).getTime();
  const endTime = new Date(sale.ends_at).getTime();
  const currentTime = now.getTime();

  if (isNaN(startTime) || isNaN(endTime)) {
    return 'disabled';
  }

  if (currentTime < startTime) {
    return 'scheduled';
  }

  if (currentTime > endTime) {
    return 'expired';
  }

  return 'active';
}

/**
 * Checks if a specific sale applies to a given product based on scope:
 * - 'all': applies to all products.
 * - 'category': matches product's category (case-insensitive & trimmed).
 * - 'products': matches product's id in sale.product_ids list.
 */
export function saleAppliesToProduct(
  sale: Sale,
  product: { id: string; category?: string | null }
): boolean {
  if (!product || !product.id) return false;

  if (sale.scope === 'all') {
    return true;
  }

  if (sale.scope === 'category') {
    if (!sale.category || !product.category) return false;
    const saleCat = sale.category.trim().toLowerCase();
    const prodCat = product.category.trim().toLowerCase();

    if (saleCat === prodCat) return true;

    // Handle standard gender aliases (e.g. "men" vs "men's jackets")
    if (saleCat === 'men' && (prodCat.includes('men') && !prodCat.includes('women'))) return true;
    if (saleCat === 'women' && (prodCat.includes('women') || prodCat.includes('ladies'))) return true;

    return false;
  }

  if (sale.scope === 'products') {
    if (!Array.isArray(sale.product_ids)) return false;
    return sale.product_ids.some((pid) => String(pid).trim() === String(product.id).trim());
  }

  return false;
}

/**
 * Returns all currently active sales.
 */
export function getActiveSales(sales: Sale[], now = new Date()): Sale[] {
  if (!Array.isArray(sales)) return [];
  return sales.filter((sale) => getSaleStatus(sale, now) === 'active');
}

/**
 * Resolves multiple active sales for a product deterministically.
 * Rule: Highest discount percentage wins.
 * If tied, more specific scope wins: 'products' > 'category' > 'all'.
 */
export function getActiveSaleForProduct(
  sales: Sale[],
  product: { id: string; category?: string | null },
  now = new Date()
): Sale | null {
  if (!Array.isArray(sales) || sales.length === 0 || !product) {
    return null;
  }

  const activeSales = getActiveSales(sales, now);
  const eligibleSales = activeSales.filter((sale) => saleAppliesToProduct(sale, product));

  if (eligibleSales.length === 0) {
    return null;
  }

  // Sort descending: highest discount first, then specificity
  const scopePriority: Record<string, number> = {
    products: 3,
    category: 2,
    all: 1,
  };

  eligibleSales.sort((a, b) => {
    // 1. Highest discount percentage
    const diff = Number(b.discount_percentage) - Number(a.discount_percentage);
    if (Math.abs(diff) > 0.001) return diff;

    // 2. Specificity
    const pA = scopePriority[a.scope] || 0;
    const pB = scopePriority[b.scope] || 0;
    if (pB !== pA) return pB - pA;

    // 3. Earliest ending sale
    return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
  });

  return eligibleSales[0];
}

/**
 * Calculates the discounted sale price.
 * salePrice = originalPrice * (1 - discountPercentage / 100)
 * Rounds to 2 decimal places (or integer if integer original price).
 */
export function calculateSalePrice(
  originalPrice: number,
  discountPercentage: number
): number {
  const p = Number(originalPrice);
  const d = Number(discountPercentage);

  if (isNaN(p) || p <= 0) return 0;
  if (isNaN(d) || d <= 0) return p;
  if (d >= 100) return 0;

  const rawSale = p * (1 - d / 100);
  // Round to 2 decimals
  return Math.round(rawSale * 100) / 100;
}

/**
 * Returns comprehensive sale calculation info for a product.
 * Reusable across Homepage, Collection, Product cards, Product page, Cart & Checkout.
 */
export function getProductSaleInfo(
  product: { id: string; price: number; category?: string | null } | null | undefined,
  sales: Sale[],
  now = new Date()
): ProductSaleCalculation {
  if (!product || isNaN(Number(product.price))) {
    return {
      hasSale: false,
      originalPrice: 0,
      salePrice: 0,
      discountPercentage: 0,
      savings: 0,
    };
  }

  const originalPrice = Number(product.price);
  const activeSale = getActiveSaleForProduct(sales, product, now);

  if (!activeSale || Number(activeSale.discount_percentage) <= 0) {
    return {
      hasSale: false,
      originalPrice,
      salePrice: originalPrice,
      discountPercentage: 0,
      savings: 0,
    };
  }

  const discountPercentage = Number(activeSale.discount_percentage);
  const salePrice = calculateSalePrice(originalPrice, discountPercentage);
  const savings = Math.max(0, Math.round((originalPrice - salePrice) * 100) / 100);

  return {
    hasSale: true,
    originalPrice,
    salePrice,
    discountPercentage,
    savings,
    saleName: activeSale.name,
    saleId: activeSale.id,
    endsAt: activeSale.ends_at,
  };
}

/**
 * Duration preset helper for Admin form:
 * Adds specified number of days to start date.
 */
export function calculateEndDateFromPreset(
  startDateStr: string,
  days: number
): string {
  const start = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(start.getTime())) return '';

  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return end.toISOString().slice(0, 16); // format: YYYY-MM-DDTHH:mm
}

/**
 * Format date for admin display with timezone notice.
 */
export function formatSaleDate(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export interface TimeRemaining {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

/**
 * Calculates remaining time until target date for countdown timers.
 */
export function getTimeRemaining(targetDateIso: string, now = new Date()): TimeRemaining {
  const target = new Date(targetDateIso).getTime();
  const current = now.getTime();
  const totalMs = Math.max(0, target - current);

  const days = Math.floor(totalMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((totalMs / 1000 / 60) % 60);
  const seconds = Math.floor((totalMs / 1000) % 60);

  return {
    totalMs,
    days,
    hours,
    minutes,
    seconds,
    isExpired: totalMs <= 0,
  };
}

/**
 * Returns all scheduled upcoming sales (enabled, starts in the future).
 */
export function getScheduledSales(sales: Sale[], now = new Date()): Sale[] {
  if (!Array.isArray(sales)) return [];
  return sales.filter((sale) => getSaleStatus(sale, now) === 'scheduled');
}

/**
 * Picks the most prominent active sale to highlight on the homepage
 * (e.g. for banners and countdown timers).
 */
export function getFeaturedActiveSale(sales: Sale[], now = new Date()): Sale | null {
  const active = getActiveSales(sales, now);
  if (active.length === 0) return null;

  return [...active].sort((a, b) => {
    // 1. Storewide 'all' sales get priority for homepage banner
    if (a.scope === 'all' && b.scope !== 'all') return -1;
    if (b.scope === 'all' && a.scope !== 'all') return 1;

    // 2. Highest discount
    if (b.discount_percentage !== a.discount_percentage) {
      return b.discount_percentage - a.discount_percentage;
    }

    // 3. Ending soonest
    return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
  })[0];
}

export type FeaturedSaleMode = 'active' | 'upcoming';

export interface FeaturedSaleResult {
  sale: Sale;
  mode: FeaturedSaleMode;
  targetDate: string; // ends_at for active sale, starts_at for upcoming sale
}

/**
 * Returns the most prominent sale for countdown timers:
 * 1. If a sale is currently active, counts down to ends_at (when the sale ends).
 * 2. If no sale is currently active, but an upcoming sale is scheduled,
 *    counts down to starts_at (when the sale will become active!).
 */
export function getFeaturedCountdownSale(sales: Sale[], now = new Date()): FeaturedSaleResult | null {
  // 1. Prioritize active sale (shoppers can buy right now)
  const activeSale = getFeaturedActiveSale(sales, now);
  if (activeSale) {
    return {
      sale: activeSale,
      mode: 'active',
      targetDate: activeSale.ends_at,
    };
  }

  // 2. Otherwise check for scheduled upcoming sales
  const scheduled = getScheduledSales(sales, now);
  if (scheduled.length === 0) return null;

  // Pick the upcoming sale starting soonest
  const soonestUpcoming = [...scheduled].sort((a, b) => {
    return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  })[0];

  return {
    sale: soonestUpcoming,
    mode: 'upcoming',
    targetDate: soonestUpcoming.starts_at,
  };
}
