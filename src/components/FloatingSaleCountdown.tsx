import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { getFeaturedCountdownSale, getTimeRemaining, TimeRemaining } from '../lib/sales';
import { Percent, Clock, X, ChevronRight, Minimize2 } from 'lucide-react';

export const FloatingSaleCountdown: React.FC = () => {
  const { sales } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState<Date>(() => new Date());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Update clock every second
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  // Do not show on admin dashboard
  if (location.pathname.startsWith('/admin') || isDismissed) {
    return null;
  }

  const featured = getFeaturedCountdownSale(sales, now);
  if (!featured) {
    return null;
  }

  const { sale, mode, targetDate } = featured;
  const remaining: TimeRemaining = getTimeRemaining(targetDate, now);

  if (remaining.isExpired) {
    return null;
  }

  const isUpcoming = mode === 'upcoming';

  const handleClick = () => {
    if (location.pathname !== '/') {
      navigate('/#shop');
    } else {
      const shopEl = document.getElementById('shop');
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const formatUnit = (num: number): string => {
    return num < 10 ? `0${num}` : String(num);
  };

  return (
    <aside
      className="fixed z-40 transition-all duration-300 pointer-events-auto"
      style={{
        left: 'clamp(14px, 2.5vw, 24px)',
        bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
      }}
      aria-label={isUpcoming ? 'Upcoming Sale Countdown' : 'Live Sale Countdown'}
    >
      {/* ================= MINIMIZED CIRCULAR ICON ================= */}
      {isMinimized ? (
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="relative group flex items-center justify-center w-14 h-14 rounded-full bg-[#0E0D0B] text-[#F7F3EA] border border-[#9A7628] shadow-2xl hover:scale-105 active:scale-95 transition-all focus:outline-none"
          title={`Click to view countdown for ${sale.name} (${sale.discount_percentage}% OFF)`}
          aria-label={`Open sale countdown for ${sale.name}`}
        >
          {/* Subtle gold glow pulse */}
          <span className="absolute -inset-0.5 rounded-full bg-[#C9A24A]/25 animate-ping opacity-60 pointer-events-none" />

          {/* Icon */}
          <div className="flex flex-col items-center justify-center">
            <Percent className="w-5 h-5 text-[#C9A24A]" />
            <span className="text-[9px] font-bold text-[#F7F3EA] leading-none mt-0.5">
              {sale.discount_percentage}%
            </span>
          </div>

          {/* Mini pulse badge */}
          <span
            className={`absolute top-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0E0D0B] ${
              isUpcoming ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'
            }`}
          />
        </button>
      ) : (
        /* ================= EXPANDED LUXURY PILL / CARD ================= */
        <div
          className="relative overflow-hidden rounded-xl border border-[#9A7628]/60 shadow-2xl text-[#F7F3EA] max-w-[280px] sm:max-w-[310px] animate-fade-in transition-all"
          style={{
            background: isUpcoming
              ? 'linear-gradient(145deg, #0B0C10 0%, #151821 60%, #0B0C10 100%)'
              : 'linear-gradient(145deg, #0B0A08 0%, #171512 60%, #0B0A08 100%)',
            boxShadow: '0 12px 36px -4px rgba(0, 0, 0, 0.65), 0 0 16px rgba(201, 162, 74, 0.15)',
          }}
        >
          {/* Top mini header bar */}
          <div className="flex items-center justify-between px-3.5 pt-2.5 pb-1 border-b border-[#9A7628]/25 bg-black/30">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isUpcoming ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-[10px] uppercase tracking-widest font-bold text-[#C9A24A]">
                {isUpcoming ? 'Upcoming Sale' : 'Sale Live Now'}
              </span>
            </div>

            <div className="flex items-center gap-1 -mr-1">
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 text-[#A89F8B] hover:text-[#F7F3EA] transition-colors rounded"
                title="Minimize countdown"
                aria-label="Minimize countdown widget"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 text-[#A89F8B] hover:text-red-400 transition-colors rounded"
                title="Dismiss countdown"
                aria-label="Close sale countdown"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main Card Content (Clickable) */}
          <div
            onClick={handleClick}
            className="p-3.5 cursor-pointer group hover:bg-white/[0.03] transition-colors"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            aria-label={`View ${sale.name} sale collection`}
          >
            {/* Title & Discount pill */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="font-serif text-sm sm:text-base font-semibold text-white truncate group-hover:text-[#C9A24A] transition-colors">
                {sale.name}
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#C9A24A] text-black flex-shrink-0">
                {sale.discount_percentage}% OFF
              </span>
            </div>

            {/* Countdown Digits Row */}
            <div className="bg-black/50 border border-[#9A7628]/35 rounded-lg p-2 mb-2.5">
              <div className="flex items-center justify-between text-[9px] uppercase tracking-wider text-[#A89F8B] mb-1 px-1">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3 h-3 text-[#C9A24A]" />
                  {isUpcoming ? 'Starts In:' : 'Ends In:'}
                </span>
                <span className="text-[8.5px] text-[#A89F8B]/80 font-mono">UTC Clock</span>
              </div>

              <div className="flex items-center justify-center gap-1.5 font-serif text-sm sm:text-base font-semibold text-[#F7F3EA] tabular-nums">
                <div className="flex flex-col items-center">
                  <span className="leading-tight px-1 py-0.5 rounded bg-black/60 border border-[#9A7628]/25 min-w-[28px] text-center">
                    {formatUnit(remaining.days)}
                  </span>
                  <span className="text-[7.5px] uppercase tracking-widest text-[#A89F8B] mt-0.5">d</span>
                </div>

                <span className="text-[#C9A24A] pb-2 font-normal">:</span>

                <div className="flex flex-col items-center">
                  <span className="leading-tight px-1 py-0.5 rounded bg-black/60 border border-[#9A7628]/25 min-w-[28px] text-center">
                    {formatUnit(remaining.hours)}
                  </span>
                  <span className="text-[7.5px] uppercase tracking-widest text-[#A89F8B] mt-0.5">h</span>
                </div>

                <span className="text-[#C9A24A] pb-2 font-normal">:</span>

                <div className="flex flex-col items-center">
                  <span className="leading-tight px-1 py-0.5 rounded bg-black/60 border border-[#9A7628]/25 min-w-[28px] text-center">
                    {formatUnit(remaining.minutes)}
                  </span>
                  <span className="text-[7.5px] uppercase tracking-widest text-[#A89F8B] mt-0.5">m</span>
                </div>

                <span className="text-[#C9A24A] pb-2 font-normal">:</span>

                <div className="flex flex-col items-center">
                  <span
                    className={`leading-tight px-1 py-0.5 rounded bg-black/60 border border-[#9A7628]/25 min-w-[28px] text-center ${
                      isUpcoming ? 'text-amber-300' : 'text-[#C9A24A]'
                    }`}
                  >
                    {formatUnit(remaining.seconds)}
                  </span>
                  <span className="text-[7.5px] uppercase tracking-widest text-[#A89F8B] mt-0.5">s</span>
                </div>
              </div>
            </div>

            {/* Bottom link CTA */}
            <div className="flex items-center justify-between text-[11px] text-[#A89F8B] group-hover:text-white transition-colors">
              <span className="font-light truncate max-w-[190px]">
                {sale.banner_text || (isUpcoming ? 'Preview collection' : 'Discount applies at checkout')}
              </span>
              <span className="flex items-center gap-0.5 text-[#C9A24A] font-semibold flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                <span>{isUpcoming ? 'View' : 'Shop'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
