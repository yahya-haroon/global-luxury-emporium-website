import React, { useState } from 'react';
import { PageLoader } from '../components/PageLoader';
import { HeroSequence } from '../components/HeroSequence';
import { TrustStrip } from '../components/TrustStrip';
import { Collection } from '../components/Collection';
import { OurStory } from '../components/OurStory';
import { ProductDrawer } from '../components/ProductDrawer';
import { useData } from '../context/DataContext';
import { Product } from '../types';

export const HomePage: React.FC = () => {
  const { products, settings, error } = useData();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleOpenProductByIndex = (index: number) => {
    if (products[index]) {
      handleOpenProduct(products[index]);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Pop-in Page Loader */}
      <PageLoader />

      <main id="top">
        {/* Supabase Error notice if request fails */}
        {error && (
          <div
            style={{
              background: '#FDF2F2',
              borderBottom: '1px solid #F8B4B4',
              color: '#9B1C1C',
              padding: '12px 24px',
              textAlign: 'center',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Pinned Scroll-Driven Hero Sequence */}
        <HeroSequence
          products={products}
          onSelectProduct={handleOpenProductByIndex}
        />

        {/* Marquee Strip */}
        <TrustStrip />

        {/* The Collection (All Jackets) */}
        <Collection onSelectProduct={handleOpenProduct} />

        {/* Our Story Band */}
        <OurStory />
      </main>

      {/* Product Drawer Panel */}
      <ProductDrawer
        product={selectedProduct}
        settings={settings}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
      />
    </>
  );
};
