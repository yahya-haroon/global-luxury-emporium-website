import React from 'react';

export const Hero: React.FC = () => {
  const scrollToShop = () => {
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative w-full overflow-hidden bg-white">
      {/* Full-width Banner Image */}
      <div className="w-full relative aspect-[21/9] sm:aspect-[16/7] md:aspect-[16/6] max-h-[560px] bg-ivory overflow-hidden">
        <img
          src="/assets/banner.png"
          alt="Global Luxury Emporium Leather Jackets Collection"
          className="w-full h-full object-cover object-center"
          loading="eager"
        />
        {/* Subtle gradient overlay to smoothly transition to content */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/40 pointer-events-none" />
      </div>

      {/* Centred Headline & CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center py-12 sm:py-16 md:py-20">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif text-gradient-gold tracking-tight mb-4">
          Leather jackets made to last a lifetime
        </h1>
        <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto font-light leading-relaxed mb-8">
          Designed in London. Crafted in our own factory in Pakistan. Shipped worldwide with uncompromising bespoke precision.
        </p>
        <div>
          <button
            onClick={scrollToShop}
            className="btn-gold"
          >
            Shop jackets
          </button>
        </div>
      </div>
    </section>
  );
};
