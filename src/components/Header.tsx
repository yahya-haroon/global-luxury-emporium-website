import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const [hasShadow, setHasShadow] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        setHasShadow(y > 40);

        const totalScroll = document.body.scrollHeight - window.innerHeight;
        const progress = totalScroll > 0 ? (y / totalScroll) * 100 : 0;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleNavClick = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();

    if (location.pathname !== '/') {
      navigate(`/#${targetId}`);
      return;
    }

    if (targetId === 'shop') {
      const sq = document.getElementById('seq');
      const stg = document.getElementById('stg');
      const hd = document.getElementById('hd');
      if (sq && stg && hd) {
        const range = sq.offsetHeight - stg.clientHeight;
        const targetTop = sq.offsetTop - hd.offsetHeight + range * 0.97;
        window.scrollTo({ top: targetTop, behavior: 'smooth' });
        return;
      }
      const shopEl = document.getElementById('shop');
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    const targetEl = document.getElementById(targetId);
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 2px Viewport Progress Bar */}
      <div id="pg" style={{ width: `${scrollProgress}%` }} aria-hidden="true" />

      {/* Solid Ivory Header */}
      <header id="hd" className={`site-header ${hasShadow ? 's' : ''}`}>
        <Link to="/" className="wm" aria-label="Global Luxury Emporium Home">
          <img
            src="/assets/logo-round.png"
            alt="Global Luxury Emporium Logo"
            width={34}
            height={34}
          />
          <span>Global Luxury Emporium</span>
        </Link>

        <nav className="main-nav sm">
          <a
            href="#shop"
            onClick={(e) => handleNavClick(e, 'shop')}
          >
            Collection
          </a>
          <a
            href="#story"
            onClick={(e) => handleNavClick(e, 'story')}
          >
            Our story
          </a>
          <a
            href="#contact"
            onClick={(e) => handleNavClick(e, 'contact')}
          >
            Contact
          </a>
        </nav>
      </header>
    </>
  );
};
