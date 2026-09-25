import React, { useEffect, useRef } from 'react';

interface Feature {
  title: string;
  text: string;
  img: string;
  alt: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Premium Genuine Leather',
    text: 'Every piece begins with carefully selected real leather, chosen for its supple grain and depth — a material meant to age beautifully rather than be replaced.',
    img: '/assets/products/product-1-detail.jpg',
    alt: 'Close detail of premium leather grain on a Global Luxury Emporium jacket',
  },
  {
    title: 'Handcrafted Construction',
    text: 'Seams, lining and hardware are assembled and finished by hand in our own workshop, so the details hold their shape wear after wear.',
    img: '/assets/products/shearling-aviator-jacket-main.png',
    alt: 'Shearling aviator leather jacket showing hand-finished construction',
  },
  {
    title: 'Tailored Fit',
    text: 'Choose from available sizes and options to shape the jacket to you, for a fit that feels considered rather than off the rack.',
    img: '/assets/models/model-racer.png',
    alt: 'Model wearing a tailored racer leather jacket',
  },
  {
    title: 'Made to Order',
    text: 'Many pieces are prepared to your selections — including personalisation — and readied before they ship.',
    img: '/assets/models/model-quilted.png',
    alt: 'Model wearing a made-to-order quilted leather jacket',
  },
  {
    title: 'Worldwide Delivery',
    text: 'Wherever you are, we ship internationally, with the delivery option chosen at checkout.',
    img: '/assets/models/campaign-quilted.jpg',
    alt: 'Campaign image of a quilted leather jacket prepared for worldwide delivery',
  },
  {
    title: 'Quality You Can Feel',
    text: 'From the weight of the hide to the final finish, each jacket is made for comfort, durability and everyday wear.',
    img: '/assets/products/classic-black-racer-jacket-main.png',
    alt: 'Classic black racer leather jacket',
  },
];

export const WhyChoose: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = sectionRef.current?.querySelectorAll('.r:not(.in)');
    elements?.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <section className="why" id="why" ref={sectionRef}>
      <div className="why-head">
        <div className="why-head-text r">
          <div className="sm" style={{ color: 'var(--au)' }}>
            Why choose our leather
          </div>
          <h2 className="section-title">Built for Quality. Designed for Life.</h2>
          <p className="why-intro">
            Every Global Luxury Emporium jacket is shaped by the material it starts with and the
            care it is finished with. These are the standards behind the pieces we make.
          </p>
        </div>
        <div className="why-head-img r" style={{ '--d': '0.1s' } as React.CSSProperties}>
          <img
            src="/assets/models/campaign-shearling.jpg"
            alt="Model wearing a Global Luxury Emporium shearling leather jacket"
            loading="lazy"
          />
        </div>
      </div>

      <div className="why-grid">
        {FEATURES.map((feature, i) => (
          <article
            key={feature.title}
            className="why-card r"
            style={{ '--d': `${(i % 3) * 0.1}s` } as React.CSSProperties}
          >
            <div className="why-card-img">
              <img src={feature.img} alt={feature.alt} loading="lazy" />
            </div>
            <div className="why-card-body">
              <span className="why-index sm">0{i + 1}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
