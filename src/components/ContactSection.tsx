import React from 'react';
import { useData } from '../context/DataContext';

export const ContactSection: React.FC = () => {
  const { settings } = useData();

  const cleanWaNumber = settings.whatsapp ? settings.whatsapp.replace(/\D/g, '') : '';
  const waUrl = cleanWaNumber ? `https://wa.me/${cleanWaNumber}` : '';
  const email = settings.contact_email || 'globalluxuryemporium@gmail.com';

  return (
    <section className="contact-sec" id="contact">
      <div className="contact-two">
        <div>
          <div className="sm" style={{ color: 'var(--au)' }}>
            Contact us
          </div>
          <h2 className="contact-title">Get in Touch</h2>
          <p className="contact-intro">
            Questions about sizing, personalisation or an existing order? Write to us and we will
            reply by email or WhatsApp.
          </p>

          <address className="contact-addr">
            {settings.address && <span>{settings.address}</span>}
            <a href={`mailto:${email}`}>{email}</a>
            {cleanWaNumber && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp: {settings.whatsapp}
              </a>
            )}
          </address>
        </div>

        <div className="contact-ctas">
          <a className="why-cta sm" href={`mailto:${email}`}>
            Email us &rarr;
          </a>
          {waUrl && (
            <a className="why-cta ghost sm" href={waUrl} target="_blank" rel="noopener noreferrer">
              WhatsApp &rarr;
            </a>
          )}
          <div className="contact-social">
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="sm">
                Instagram
              </a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="sm">
                Facebook
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
