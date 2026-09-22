import React, { useEffect, useState } from 'react';

interface PageLoaderProps {
  onLoaded?: () => void;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ onLoaded }) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Lock body scroll initially
    document.body.classList.add('lock');

    let isDone = false;
    const dismiss = () => {
      if (isDone) return;
      isDone = true;
      setIsDismissed(true);
      document.body.classList.remove('lock');

      // Trigger curtain opening on banner
      const bn = document.getElementById('bn');
      if (bn) {
        bn.classList.add('on');
      }

      if (onLoaded) {
        onLoaded();
      }
    };

    // Standard timer at 1.3s, fallback at 3.5s
    const timer = setTimeout(dismiss, 1300);
    const fallbackTimer = setTimeout(dismiss, 3500);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      document.body.classList.remove('lock');
    };
  }, [onLoaded]);

  return (
    <div id="ld" className={isDismissed ? 'up' : ''} aria-hidden={isDismissed}>
      <img
        src="/assets/logo-round.png"
        alt="Global Luxury Emporium Logo"
        width={88}
        height={88}
      />
    </div>
  );
};
