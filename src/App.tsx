import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { CartProvider } from './context/CartContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { FloatingSaleCountdown } from './components/FloatingSaleCountdown';

// Pages: HomePage is loaded immediately; secondary routes are code-split for maximum performance
import { HomePage } from './pages/HomePage';
const ProductPage = React.lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const DeliveryPage = React.lazy(() => import('./pages/DeliveryPage').then((m) => ({ default: m.DeliveryPage })));
const ReturnsPage = React.lazy(() => import('./pages/ReturnsPage').then((m) => ({ default: m.ReturnsPage })));
const PrivacyPage = React.lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));

import { initClarity } from './lib/clarity';

const PageFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center bg-ivory">
    <div className="w-8 h-8 rounded-full border-2 border-gold/30 border-t-gold animate-spin" />
  </div>
);

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export const App: React.FC = () => {
  React.useEffect(() => {
    initClarity();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <CartProvider>
            <ScrollToTop />
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--iv)', color: 'var(--ink)' }}>
              <Header />
              <div style={{ flex: '1 0 auto' }}>
                <React.Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/product/:id" element={<ProductPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="/delivery" element={<DeliveryPage />} />
                    <Route path="/returns" element={<ReturnsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </React.Suspense>
              </div>
              <Footer />
            </div>
            <CartDrawer />
            <FloatingSaleCountdown />
          </CartProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
