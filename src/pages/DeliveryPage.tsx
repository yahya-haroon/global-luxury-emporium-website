import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '../components/SEO';

export const DeliveryPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEO
        title="Worldwide Shipping & Delivery Information"
        description="Global Luxury Emporium delivers handcrafted luxury leather jackets across the globe with tracked DHL Express & FedEx couriers. Dispatch schedules, transit times and custom duties."
        canonical="/delivery"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Delivery Information', item: '/delivery' },
        ]}
      />
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-gold transition-colors mb-8 focus:outline-none focus-visible:text-gold"
      >
        <ArrowLeft className="w-4 h-4" /> Back to collection
      </Link>

      <h1 className="font-serif text-3xl sm:text-4xl text-text font-medium mb-6">
        Delivery & Worldwide Shipping
      </h1>

      <div className="text-stone-700 space-y-5 font-normal leading-relaxed text-sm sm:text-base">
        <p>
          Global Luxury Emporium Ltd is dedicated to delivering bespoke, handcrafted leather garments across the globe with maximum reliability and security.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Dispatch & Crafting Schedule</h3>
        <p>
          Each jacket is meticulously cut and tailored in our specialized workshop in Pakistan. Standard in-stock orders are dispatched within 2 to 4 business days. Made-to-order or custom monogrammed pieces require an estimated 7 to 10 working days for artisan tailoring before shipment.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">International Couriers</h3>
        <p>
          We partner with premium global carriers including DHL Express, FedEx, and Royal Mail to provide end-to-end tracked courier delivery. A tracking confirmation link is sent immediately upon package dispatch.
        </p>

        <h3 className="font-serif text-xl text-text font-medium pt-4">Customs, Duties & Taxes</h3>
        <p>
          International orders shipped outside the United Kingdom may be subject to local import taxes or customs duties assessed by the destination jurisdiction. All such fees remain the customer’s responsibility.
        </p>
      </div>
    </div>
  );
};
