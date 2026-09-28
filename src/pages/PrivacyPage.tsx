import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '../components/SEO';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEO
        title="Privacy & Cookie Policy"
        description="Learn how Global Luxury Emporium Ltd protects your personal data, secure Stripe payment processing, and GDPR compliance."
        canonical="/privacy"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Privacy Policy', item: '/privacy' },
        ]}
      />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-gold transition-colors mb-8 focus:outline-none focus-visible:text-gold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to collection
      </Link>

      <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium mb-6">
        Privacy & Cookie Policy
      </h1>

      <div className="text-stone-700 space-y-5 font-normal leading-relaxed text-sm sm:text-base">
        <p>
          Global Luxury Emporium Ltd ("we", "our", or "us") respects your privacy and is committed to protecting your personal data in compliance with the UK General Data Protection Regulation (UK GDPR) and Data Protection Act 2018.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Data We Collect</h3>
        <p>
          When you place an order via Stripe, we receive order fulfillment information such as your name, delivery address, contact email, and sizing preferences necessary to craft and ship your garment. Payment card information is processed securely by Stripe and is never stored on our servers.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">How We Use Your Information</h3>
        <p>
          Your information is solely utilized to process, customize, fulfill, and track your order, communicate updates via email or WhatsApp regarding shipping, and meet statutory regulatory accounting requirements.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Third-Party Sharing</h3>
        <p>
          We do not sell, lease, or monetize customer data. Information is shared strictly with trusted fulfillment partners (couriers and Stripe payments) for operational delivery.
        </p>
      </div>
    </div>
  );
};
