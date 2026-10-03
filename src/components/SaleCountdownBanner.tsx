import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { getFeaturedActiveSale, getTimeRemaining, TimeRemaining } from '../lib/sales';
import { Clock, ArrowRight, Sparkles } from 'lucide-react';

export const SaleCountdownBanner: React.FC = () => {
  const { sales } = useData();
  const [now, setNow] = useState<Date>(() => new Date());

  // Update clock every second for live countdown
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const featuredSale = getFeaturedActiveSale(sales, now);

  if (!featuredSale) {
    return null;
  }

  const remaining: TimeRemaining = getTimeRemaining(featuredSale.ends_at, now);

  if (remaining.isExpired) {
    return null;
  }

  const scrollToShop = (e: React.MouseEvent) => {
    e.preventDefault();
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const formatUnit = (num: number): string => {
    return num < 10 ? `0${num}` : String(num);
  };

  // Scope descriptive summary
  let scopeLabel = 'Store-wide Promotion';
  if (featuredSale.scope === 'category') {
    scopeLabel = `${featuredSale.category} Collection Exclusive`;
  } else if (featuredSale.scope === 'products') {
    const count = featuredSale.product_ids?.length || 0;
    scopeLabel = `Selected Pieces (${count} ${count === 1 ? 'Jacket' : 'Jackets'})`;
  }

  return (
    <aside
      className="relative z-20 w-full overflow-hidden border-y border-[#9A7628]/40 shadow-lg text-[#F7F3EA]"
      style={{
        background: 'linear-gradient(135deg, #0B0A08 0%, #151310 50%, #0B0A08 100%)',
      }}
      aria-label="Promotional Sale Countdown"
    >
      {/* Subtle gold accent aura */}
      <div
        className="pointer-events-none absolute -top-16 left-1/4 h-32 w-96 rounded-full bg-[#C9A24A]/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
          {/* Left Column: Headline, Discount Badge, and Scope */}
          <div className="flex items-center gap-3.5 text-center md:text-left">
            <div className="hidden sm:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#C9A24A]/15 border border-[#C9A24A]/30 text-[#C9A24A]">
              <Sparkles className="h-5 w-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-[#C9A24A]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C9A24A] animate-pulse" />
                  Live Event
                </span>
                <span className="text-[#A89F8B] text-xs font-light">&bull;</span>
                <span className="text-[11px] uppercase tracking-wider text-[#A89F8B] font-medium">
                  {scopeLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-0.5">
                <h3 className="font-serif text-lg sm:text-xl font-medium tracking-wide text-white">
                  {featuredSale.name}
                </h3>
                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#C9A24A] text-black">
                  {featuredSale.discount_percentage}% OFF
                </span>
              </div>

              {featuredSale.banner_text && (
                <p className="text-xs text-[#D8CFBC] font-light mt-0.5 italic line-clamp-1 max-w-lg">
                  "{featuredSale.banner_text}"
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Live Countdown Clock & Call-to-action */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {/* Countdown Blocks */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[#A89F8B] font-medium mr-1 hidden lg:inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#C9A24A]" /> Ends in:
              </span>

              {/* Days */}
              <div className="flex flex-col items-center">
                <div className="min-w-[42px] sm:min-w-[50px] px-2 py-1 rounded bg-black/60 border border-[#9A7628]/40 text-center shadow-inner">
                  <span className="font-serif text-lg sm:text-xl font-semibold text-[#F7F3EA] tabular-nums leading-none">
                    {formatUnit(remaining.days)}
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#A89F8B] mt-1 font-light">
                  Days
                </span>
              </div>

              <span className="font-serif text-base sm:text-lg text-[#C9A24A] pb-3 select-none">:</span>

              {/* Hours */}
              <div className="flex flex-col items-center">
                <div className="min-w-[42px] sm:min-w-[50px] px-2 py-1 rounded bg-black/60 border border-[#9A7628]/40 text-center shadow-inner">
                  <span className="font-serif text-lg sm:text-xl font-semibold text-[#F7F3EA] tabular-nums leading-none">
                    {formatUnit(remaining.hours)}
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#A89F8B] mt-1 font-light">
                  Hours
                </span>
              </div>

              <span className="font-serif text-base sm:text-lg text-[#C9A24A] pb-3 select-none">:</span>

              {/* Minutes */}
              <div className="flex flex-col items-center">
                <div className="min-w-[42px] sm:min-w-[50px] px-2 py-1 rounded bg-black/60 border border-[#9A7628]/40 text-center shadow-inner">
                  <span className="font-serif text-lg sm:text-xl font-semibold text-[#F7F3EA] tabular-nums leading-none">
                    {formatUnit(remaining.minutes)}
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#A89F8B] mt-1 font-light">
                  Mins
                </span>
              </div>

              <span className="font-serif text-base sm:text-lg text-[#C9A24A] pb-3 select-none">:</span>

              {/* Seconds */}
              <div className="flex flex-col items-center">
                <div className="min-w-[42px] sm:min-w-[50px] px-2 py-1 rounded bg-black/60 border border-[#9A7628]/40 text-center shadow-inner">
                  <span className="font-serif text-lg sm:text-xl font-semibold text-[#C9A24A] tabular-nums leading-none">
                    {formatUnit(remaining.seconds)}
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#A89F8B] mt-1 font-light">
                  Secs
                </span>
              </div>
            </div>

            {/* Shop The Sale Button */}
            <a
              href="#shop"
              onClick={scrollToShop}
              className="btn-gold text-xs py-2 px-4 inline-flex items-center gap-1.5 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
            >
              <span>Shop The Sale</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};
