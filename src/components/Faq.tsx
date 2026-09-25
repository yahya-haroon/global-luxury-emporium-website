import React, { useState } from 'react';
import { useData } from '../context/DataContext';

export const Faq: React.FC = () => {
  const { settings } = useData();
  const [open, setOpen] = useState<number | null>(0);

  const zones =
    settings.delivery_zones.map((z) => z.name).filter(Boolean).join(', ') ||
    'the United Kingdom and internationally';

  const items = [
    {
      q: 'How do I choose my size?',
      a: 'Each product page lists the sizes available for that piece, and the leather guide above shows the full range we stock across the collection.',
    },
    {
      q: 'Can I personalise my jacket?',
      a: settings.personalisation.enabled
        ? `Yes — ${settings.personalisation.label} is available at checkout on pieces that allow it. ${settings.personalisation.hint}`
        : 'Personalisation is available on selected pieces — check the product page for the options offered.',
    },
    {
      q: 'Where do you deliver?',
      a: `We deliver to ${zones}. Choose your delivery zone at checkout and the price is added to your order total.`,
    },
    {
      q: 'How do verified reviews work?',
      a: 'Reviews open once your order has been delivered. The Verified Purchase badge is granted automatically by our order-verification service — it can never be claimed or edited by shoppers.',
    },
    {
      q: 'How do I pay?',
      a: 'Payments are processed securely at checkout by Stripe. Your card details are handled by Stripe and never reach our servers.',
    },
  ];

  return (
    <section className="faq">
      <div className="faq-head">
        <div className="sm" style={{ color: 'var(--au)' }}>
          FAQs
        </div>
        <h2 className="faq-title">Quick Questions</h2>
      </div>

      <div className="faq-list">
        {items.map((item, i) => (
          <div key={item.q} className="faq-item">
            <h3>
              <button
                type="button"
                className="faq-q"
                aria-expanded={open === i}
                aria-controls={`faq-panel-${i}`}
                id={`faq-button-${i}`}
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span>{item.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  {open === i ? '−' : '+'}
                </span>
              </button>
            </h3>
            {open === i && (
              <p className="faq-a" id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-button-${i}`}>
                {item.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
