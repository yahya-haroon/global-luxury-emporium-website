import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, X, ShoppingBag, Menu, ChevronDown } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useCart } from '../context/CartContext';
import { CATEGORY_LIST } from '../lib/categories';

export const Header: React.FC = () => {
  const [hasShadow, setHasShadow] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [menDropdownOpen, setMenDropdownOpen] = useState(false);
  const [womenDropdownOpen, setWomenDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { searchQuery, setSearchQuery, homepageSlots } = useData();
  const { totalCount, openCart } = useCart();

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        setHasShadow(y > 40);

        const totalScroll = document.body.scrollHeight - window.innerHeight;
        const progress = totalScroll > 0 ? (y / totalScroll) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Focus the field when the search opens.
  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 60);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  // Close the search when clicking outside of it.
  useEffect(() => {
    if (!searchOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [searchOpen]);

  // Close mobile navigation drawer and category dropdowns on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setMenDropdownOpen(false);
    setWomenDropdownOpen(false);
  }, [location.pathname]);

  const scrollToCollection = () => {
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToCollection = () => {
    if (location.pathname !== '/') {
      navigate('/');
      window.setTimeout(scrollToCollection, 120);
    } else {
      scrollToCollection();
    }
  };

  const openSearch = () => {
    setSearchOpen(true);
    // Ensure the results are reachable when opening from another route.
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    goToCollection();
  };

  const clearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  const handleNavClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();

    if (location.pathname !== '/') {
      navigate(`/#${targetId}`);
      return;
    }

    if (targetId === 'shop') {
      const sq = document.getElementById('seq');
      const stg = document.getElementById('stg');
      const hd = document.getElementById('hd');
      if (sq && stg && hd) {
        const range = sq.offsetHeight - stg.clientHeight;
        const targetTop = sq.offsetTop - hd.offsetHeight + range * 0.97;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
        return;
      }
      const shopEl = document.getElementById('shop');
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 2px Viewport Progress Bar */}
      <div id="pg" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      {/* Announcement Bar */}
      <div className="announce sm" role="note">
        <span>Free delivery to UK</span>
        <span aria-hidden="true">&middot;</span>
        <span>Worldwide shipping</span>
        <span aria-hidden="true">&middot;</span>
        <span>Secure Stripe checkout</span>
      </div>

      {/* Solid Ivory Header */}
      <header id="hd" className={`site-header ${hasShadow ? 's' : ''}`}>
        <Link to="/" className="wm" aria-label="Global Luxury Emporium Home">
          <img
            src={homepageSlots.header_logo?.image_url || '/assets/logo-round.png'}
            alt={homepageSlots.header_logo?.alt_text || 'Global Luxury Emporium Logo'}
            width={34}
            height={34}
            decoding="async"
          />
          <span>Global Luxury Emporium</span>
        </Link>

        <div className="header-actions">
          <nav className="main-nav sm">
            <a href="#shop" onClick={(e) => handleNavClick(e, 'shop')}>
              Collection
            </a>

            {/* Men Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setMenDropdownOpen(true)}
              onMouseLeave={() => setMenDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMenDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 hover:text-gold transition-colors py-1 cursor-pointer focus:outline-none uppercase tracking-wide font-medium"
                aria-expanded={menDropdownOpen}
              >
                <span>MEN</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    menDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {menDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-52 bg-ivory border border-hairline rounded shadow-xl py-2 z-50 animate-fade-in text-left"
                  style={{ backgroundColor: 'var(--top-bg, var(--iv, #F7F3EA))', borderColor: 'var(--ln, #DDD5C4)' }}
                >
                  <div
                    className="px-3.5 py-1 text-[10px] uppercase font-bold tracking-widest text-text border-b border-hairline mb-1"
                    style={{ color: 'var(--top-text, var(--ink, #141210))', borderColor: 'var(--ln, #DDD5C4)' }}
                  >
                    Men's Jackets
                  </div>
                  {CATEGORY_LIST.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/men/${cat.slug}`}
                      onClick={() => setMenDropdownOpen(false)}
                      className="block px-3.5 py-2 text-xs text-text font-semibold hover:bg-gold/15 hover:text-gold-dark transition-colors"
                      style={{ color: 'var(--top-text, var(--ink, #141210))' }}
                    >
                      {cat.name} Jackets
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Women Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setWomenDropdownOpen(true)}
              onMouseLeave={() => setWomenDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setWomenDropdownOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 hover:text-gold transition-colors py-1 cursor-pointer focus:outline-none uppercase tracking-wide font-medium"
                aria-expanded={womenDropdownOpen}
              >
                <span>WOMEN</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    womenDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {womenDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-52 bg-ivory border border-hairline rounded shadow-xl py-2 z-50 animate-fade-in text-left"
                  style={{ backgroundColor: 'var(--top-bg, var(--iv, #F7F3EA))', borderColor: 'var(--ln, #DDD5C4)' }}
                >
                  <div
                    className="px-3.5 py-1 text-[10px] uppercase font-bold tracking-widest text-text border-b border-hairline mb-1"
                    style={{ color: 'var(--top-text, var(--ink, #141210))', borderColor: 'var(--ln, #DDD5C4)' }}
                  >
                    Women's Jackets
                  </div>
                  {CATEGORY_LIST.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/women/${cat.slug}`}
                      onClick={() => setWomenDropdownOpen(false)}
                      className="block px-3.5 py-2 text-xs text-text font-semibold hover:bg-gold/15 hover:text-gold-dark transition-colors"
                      style={{ color: 'var(--top-text, var(--ink, #141210))' }}
                    >
                      {cat.name} Jackets
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <a href="#story" onClick={(e) => handleNavClick(e, 'story')}>
              Our story
            </a>
            <a href="#contact" onClick={(e) => handleNavClick(e, 'contact')}>
              Contact
            </a>
          </nav>

          <div className={`header-search ${searchOpen ? 'open' : ''}`} ref={searchWrapRef}>
            <form role="search" className="search-form" onSubmit={handleSearchSubmit}>
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchOpen(false);
                  }
                }}
                placeholder="Search the collection…"
                aria-label="Search products"
              />
              {searchOpen && searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={clearSearch}
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            <button
              type="button"
              className="search-toggle"
              onClick={() => (searchOpen ? setSearchOpen(false) : openSearch())}
              aria-label={searchOpen ? 'Close search' : 'Search products'}
              aria-expanded={searchOpen}
            >
              <Search className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Shopping Bag / Cart Trigger */}
          <button
            type="button"
            onClick={openCart}
            className="cart-toggle relative p-1.5 text-inherit hover:text-gold transition-colors flex items-center justify-center"
            aria-label={`Shopping bag, ${totalCount} ${totalCount === 1 ? 'item' : 'items'}`}
          >
            <ShoppingBag className="w-[19px] h-[19px]" />
            {totalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                {totalCount}
              </span>
            )}
          </button>

          {/* Mobile Navigation Toggle (Visible on mobile screens) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 text-inherit hover:text-gold transition-colors flex items-center justify-center -mr-1"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Slide-down Navigation Panel */}
      {mobileMenuOpen && (
        <div
          className="md:hidden border-b border-hairline px-6 py-5 space-y-4 animate-fade-in shadow-lg"
          style={{
            backgroundColor: 'var(--top-bg, var(--iv))',
            color: 'var(--top-text, var(--ink))',
          }}
        >
          <nav className="flex flex-col space-y-3 font-serif text-base tracking-wide">
            <a
              href="#shop"
              onClick={(e) => {
                handleNavClick(e, 'shop');
                setMobileMenuOpen(false);
              }}
              className="py-1 hover:text-gold transition-colors border-b border-hairline/40 pb-2"
            >
              All Collection
            </a>

            {/* Mobile Men's Categories */}
            <div className="border-b border-hairline/40 pb-3">
              <span
                className="text-[11px] uppercase tracking-wider text-text font-bold block mb-2 font-mono"
                style={{ color: 'var(--top-text, var(--ink, #141210))' }}
              >
                Men's Jackets
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-serif">
                {CATEGORY_LIST.map((cat) => (
                  <Link
                    key={`men-${cat.slug}`}
                    to={`/men/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-2.5 rounded bg-ivory hover:bg-[#EAE4D5] transition-colors text-text border border-hairline font-semibold text-center"
                    style={{ backgroundColor: 'var(--top-bg, var(--iv, #F7F3EA))', color: 'var(--top-text, var(--ink, #141210))', borderColor: 'var(--ln, #DDD5C4)' }}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Mobile Women's Categories */}
            <div className="border-b border-hairline/40 pb-3">
              <span
                className="text-[11px] uppercase tracking-wider text-text font-bold block mb-2 font-mono"
                style={{ color: 'var(--top-text, var(--ink, #141210))' }}
              >
                Women's Jackets
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-serif">
                {CATEGORY_LIST.map((cat) => (
                  <Link
                    key={`women-${cat.slug}`}
                    to={`/women/${cat.slug}`}
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-2.5 rounded bg-ivory hover:bg-[#EAE4D5] transition-colors text-text border border-hairline font-semibold text-center"
                    style={{ backgroundColor: 'var(--top-bg, var(--iv, #F7F3EA))', color: 'var(--top-text, var(--ink, #141210))', borderColor: 'var(--ln, #DDD5C4)' }}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
            <a
              href="#story"
              onClick={(e) => {
                handleNavClick(e, 'story');
                setMobileMenuOpen(false);
              }}
              className="py-1 hover:text-gold transition-colors border-b border-hairline/40 pb-2"
            >
              Our Story
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                handleNavClick(e, 'contact');
                setMobileMenuOpen(false);
              }}
              className="py-1 hover:text-gold transition-colors border-b border-hairline/40 pb-2"
            >
              Contact
            </a>
            <Link
              to="/delivery"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-xs text-muted hover:text-gold transition-colors"
            >
              Delivery &amp; Shipping Policy
            </Link>
            <Link
              to="/returns"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 text-xs text-muted hover:text-gold transition-colors"
            >
              Returns &amp; Exchanges
            </Link>
          </nav>
        </div>
      )}
    </>
  );
};
