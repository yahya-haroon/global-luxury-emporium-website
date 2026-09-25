import React from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { ProductPage } from './pages/ProductPage';
import { AdminPage } from './pages/AdminPage';
import { DeliveryPage } from './pages/DeliveryPage';
import { ReturnsPage } from './pages/ReturnsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ScrollToTop />
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--iv)', color: 'var(--ink)' }}>
            <Header />
            <div style={{ flex: '1 0 auto' }}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/delivery" element={<DeliveryPage />} />
                <Route path="/returns" element={<ReturnsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </div>
            <Footer />
          </div>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
