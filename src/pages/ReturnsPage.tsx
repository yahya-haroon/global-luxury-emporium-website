import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '../components/SEO';

export const ReturnsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEO
        title="Returns, Exchanges & Quality Guarantee"
        description="Global Luxury Emporium provides 14-day hassle-free worldwide returns and size exchanges on non-customized handcrafted leather garments. Complete customer satisfaction guaranteed."
        canonical="/returns"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Returns & Exchanges', item: '/returns' },
        ]}
      />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-gold transition-colors mb-8 focus:outline-none focus-visible:text-gold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to collection
      </Link>

      <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium mb-6">
        Returns, Exchanges & Guarantee
      </h1>

      <div className="text-stone-700 space-y-5 font-normal leading-relaxed text-sm sm:text-base">
        <p>
          We stand by the craftsmanship of every garment crafted in our factory. If you are not entirely satisfied with your purchase, we provide comprehensive return and exchange services.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">14-Day Return Policy</h3>
        <p>
          Standard non-customised items may be returned within 14 days of delivery. Garments must remain unworn, unwashed, and in original packaging with all security tags attached.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Bespoke & Personalised Pieces</h3>
        <p>
          Jackets customised with individual initials, names, or personalized embroidery alterations are non-returnable unless a manufacturing defect is present upon delivery.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Initiating a Return</h3>
        <p>
          Please reach out to our customer concierge team via email at globalluxuryemporium@gmail.com or via WhatsApp with your order reference to receive a prepaid return label and instructions.
        </p>
      </div>
    </div>
  );
};
