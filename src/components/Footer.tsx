import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';

export const Footer: React.FC = () => {
  const { settings } = useData();

  const cleanWaNumber = settings.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '923278434142';
  const waUrl = `https://wa.me/${cleanWaNumber}`;
  const email = settings.contact_email || 'globalluxuryemporium@gmail.com';

  return (
    <>
      <footer id="contact" className="site-footer">
        {/* Column 1: Brand Info */}
        <div>
          <div className="wm" style={{ color: 'var(--ink)', marginBottom: '18px' }}>
            <span>Global Luxury Emporium Ltd</span>
          </div>
          <p style={{ margin: 0 }}>
            {settings.address || 'London, United Kingdom'}
            <br />
            Premium brands. Timeless style. Global reach.
          </p>
        </div>

        {/* Column 2: Contact */}
        <div>
          <h4>Contact</h4>
          <a href={waUrl} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a href={`mailto:${email}`}>
            Email us
          </a>
        </div>

        {/* Column 3: Follow & Policies */}
        <div>
          <h4>Follow</h4>
          {settings.instagram_url && (
            <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer">
              Instagram
            </a>
          )}
          {settings.facebook_url && (
            <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer">
              Facebook
            </a>
          )}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Link to="/delivery" style={{ fontSize: '13px' }}>
              Delivery Policy
            </Link>
            <Link to="/returns" style={{ fontSize: '13px' }}>
              Returns &amp; Exchanges
            </Link>
            <Link to="/privacy" style={{ fontSize: '13px' }}>
              Privacy Policy
            </Link>
            <Link to="/admin" style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>
              Owner Portal
            </Link>
          </div>
        </div>

        {/* Copyright */}
        <div className="cp">
          &copy; 2026 Global Luxury Emporium Ltd. All rights reserved.
        </div>
      </footer>

      {/* Discreet Floating WhatsApp Pill */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-pill"
        aria-label="Chat with Global Luxury Emporium on WhatsApp"
      >
        <span>WhatsApp</span>
      </a>
    </>
  );
};
