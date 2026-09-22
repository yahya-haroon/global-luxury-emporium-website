import React, { useEffect, useRef } from 'react';
import { Product } from '../types';

interface HeroSequenceProps {
  products: Product[];
  onSelectProduct: (index: number) => void;
}

interface ModelMeta {
  file: string;
  x0: number;
  y0: number;
  w: number;
  h: number;
}

const MODELS: ModelMeta[] = [
  {
    file: '/assets/models/model-1.png',
    x0: 729,
    y0: 41,
    w: 522,
    h: 752,
  },
  {
    file: '/assets/models/model-2.png',
    x0: 1049,
    y0: 74,
    w: 373,
    h: 719,
  },
  {
    file: '/assets/models/model-3.png',
    x0: 1357,
    y0: 29,
    w: 407,
    h: 764,
  },
];

const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

const easeOutCubic = (t: number) =>
  1 - Math.pow(1 - t, 3);

export const HeroSequence: React.FC<HeroSequenceProps> = ({
  products,
  onSelectProduct,
}) => {
  const seqRef = useRef<HTMLDivElement>(null);
  const stgRef = useRef<HTMLDivElement>(null);
  const bkRef = useRef<HTMLDivElement>(null);
  const bnRef = useRef<HTMLDivElement>(null);
  const in0Ref = useRef<HTMLDivElement>(null);
  const ttlRef = useRef<HTMLDivElement>(null);

  const moRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cfRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const geomRef = useRef<{
    ms: {
      s0: number;
      s1: number;
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    }[];
  }>({ ms: [] });

  useEffect(() => {
    const isReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (isReducedMotion) {
      document.documentElement.classList.add('flat');
      return;
    }

    let animationFrame = 0;
    let targetProgress = 0;
    let currentProgress = 0;

    const layout = () => {
      const hd = document.getElementById('hd');
      const hh = hd ? hd.offsetHeight : 60;

      document.documentElement.style.setProperty(
        '--hh',
        `${hh}px`
      );

      const st = stgRef.current;

      if (!st) return;

      const W = st.clientWidth;
      const H = st.clientHeight;

      if (!W || !H) return;

      const mob = W < 700;
      const s = mob ? W / 1040 : W / 1983;

      const bw = 1983 * s;
      const bh = 793 * s;

      const bx = mob ? -735 * s : 0;
      const bt = Math.max(
        0,
        (H - bh) / 2 - 30
      );

      if (bnRef.current) {
        bnRef.current.style.left = `${bx}px`;
        bnRef.current.style.top = `${bt}px`;
        bnRef.current.style.width = `${bw}px`;
      }

      if (in0Ref.current) {
        in0Ref.current.style.top =
          `${bt + bh + 34}px`;
      }

      const g = mob ? 8 : 28;
      const pad = mob ? 14 : 72;

      const cw = Math.min(
        (W - 2 * pad - 2 * g) / 3,
        360
      );

      const ch = cw * 1.25;

      const l0 =
        (W - (3 * cw + 2 * g)) / 2;

      const ey = Math.max(
        96,
        (H - ch - 70) / 2 + 34
      );

      const eh = ch * 0.94;

      if (ttlRef.current) {
        ttlRef.current.style.top =
          `${Math.max(14, ey - 92)}px`;
      }

      geomRef.current.ms = MODELS.map(
        (m, i) => {
          const es = eh / m.h;
          const ew = m.w * es;

          const el = moRefs.current[i];
          const fr = cfRefs.current[i];

          const fx =
            l0 + i * (cw + g);

          if (el) {
            el.style.width =
              `${m.w}px`;

            el.style.height =
              `${m.h}px`;
          }

          if (fr) {
            fr.style.left =
              `${fx}px`;

            fr.style.top =
              `${ey}px`;

            fr.style.width =
              `${cw}px`;

            fr.style.height =
              `${ch}px`;
          }

          return {
            s0: s,
            s1: es,

            x0:
              bx + m.x0 * s,

            y0:
              bt + m.y0 * s,

            x1:
              fx + (cw - ew) / 2,

            y1:
              ey + ch - eh - ch * 0.03,
          };
        }
      );

      updateScrollTarget();
    };

    const updateScrollTarget = () => {
      const sq = seqRef.current;
      const stg = stgRef.current;
      const hd = document.getElementById('hd');

      if (
        !sq ||
        !stg ||
        geomRef.current.ms.length === 0
      ) {
        return;
      }

      const range = Math.max(
        1,
        sq.offsetHeight -
          stg.clientHeight
      );

      const hh = hd
        ? hd.offsetHeight
        : 60;

      targetProgress = clamp(
        (hh -
          sq.getBoundingClientRect().top) /
          range
      );

      if (!animationFrame) {
        animationFrame =
          requestAnimationFrame(animate);
      }
    };

    const animate = () => {
      animationFrame = 0;

      /*
       * Smooth interpolation.
       * This prevents the models from jumping
       * directly between scroll positions.
       */
      currentProgress +=
        (targetProgress - currentProgress) *
        0.12;

      const p = currentProgress;

      if (bnRef.current) {
        bnRef.current.style.opacity =
          String(
            1 -
              clamp(
                (p - 0.1) / 0.16
              )
          );
      }

      if (bkRef.current) {
        bkRef.current.style.transform =
          `translate3d(0, ${
            -easeOutCubic(
              clamp(
                (p - 0.28) / 0.3
              )
            ) * 101
          }%, 0)`;
      }

      if (in0Ref.current) {
        in0Ref.current.style.opacity =
          String(
            1 -
              clamp(
                p / 0.08
              )
          );
      }

      if (ttlRef.current) {
        const a =
          clamp(
            (p - 0.6) / 0.2
          );

        ttlRef.current.style.opacity =
          String(a);

        ttlRef.current.style.transform =
          `translate3d(0, ${
            (1 - a) * 20
          }px, 0)`;
      }

      geomRef.current.ms.forEach(
        (c, i) => {
          const el =
            moRefs.current[i];

          const fr =
            cfRefs.current[i];

          if (!el || !fr) return;

          const q =
            easeOutCubic(
              clamp(
                (p -
                  0.14 -
                  i * 0.06) /
                  0.5
              )
            );

          const sc =
            c.s0 +
            (c.s1 - c.s0) * q;

          const tx =
            c.x0 +
            (c.x1 - c.x0) * q;

          const ty =
            c.y0 +
            (c.y1 - c.y0) * q;

          /*
           * Very subtle rotation.
           * Reduced from 5deg to 3deg
           * for a cleaner luxury movement.
           */
          const rot =
            (i - 1) *
            3 *
            q *
            (1 - q);

          el.style.transform =
            `translate3d(${tx}px, ${ty}px, 0) ` +
            `scale(${sc}) ` +
            `rotate(${rot}deg)`;

          el.style.opacity =
            String(
              clamp(p / 0.03)
            );

          fr.style.opacity =
            String(
              clamp(
                (p -
                  0.5 -
                  i * 0.04) /
                  0.15
              )
            );

          const lbl =
            fr.querySelector<HTMLElement>(
              '.lbl'
            );

          if (lbl) {
            lbl.style.opacity =
              String(
                clamp(
                  (p -
                    0.74 -
                    i * 0.04) /
                    0.12
                )
              );
          }

          fr.style.pointerEvents =
            p > 0.9
              ? 'auto'
              : 'none';
        }
      );

      /*
       * Keep animating until the visual position
       * catches the user's actual scroll position.
       */
      if (
        Math.abs(
          targetProgress -
            currentProgress
        ) > 0.0005
      ) {
        animationFrame =
          requestAnimationFrame(
            animate
          );
      }
    };

    const onScroll = () => {
      updateScrollTarget();
    };

    const onResize = () => {
      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );

        animationFrame = 0;
      }

      layout();
    };

    window.addEventListener(
      'resize',
      onResize
    );

    window.addEventListener(
      'scroll',
      onScroll,
      { passive: true }
    );

    /*
     * Initial layout.
     */
    layout();

    /*
     * Recalculate when fonts finish loading.
     */
    if (document.fonts) {
      document.fonts.ready.then(
        layout
      );
    }

    return () => {
      window.removeEventListener(
        'resize',
        onResize
      );

      window.removeEventListener(
        'scroll',
        onScroll
      );

      if (animationFrame) {
        cancelAnimationFrame(
          animationFrame
        );
      }
    };
  }, []);

  const handleCardHover = (
    index: number,
    isHovered: boolean
  ) => {
    const mo =
      moRefs.current[index];

    if (mo) {
      if (isHovered) {
        mo.classList.add('hov');
      } else {
        mo.classList.remove('hov');
      }
    }
  };

  const handleScrollToShop = (
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    const sq =
      seqRef.current;

    const stg =
      stgRef.current;

    const hd =
      document.getElementById('hd');

    if (sq && stg && hd) {
      const range =
        sq.offsetHeight -
        stg.clientHeight;

      window.scrollTo({
        top:
          sq.offsetTop -
          hd.offsetHeight +
          range * 0.97,
        behavior: 'smooth',
      });
    }
  };

  const displayProducts =
    products.slice(0, 3);

  return (
    <div
      id="seq"
      ref={seqRef}
    >
      <div
        id="stg"
        ref={stgRef}
      >
        {/* Docked Target Product Frames (.cf) */}
        {displayProducts.map(
          (product, i) => (
            <a
              key={
                product.id || i
              }
              ref={(el) =>
                (cfRefs.current[i] =
                  el)
              }
              className="cf"
              href={`/product/${product.id}`}
              onClick={(e) => {
                e.preventDefault();
                onSelectProduct(i);
              }}
              onMouseEnter={() =>
                handleCardHover(
                  i,
                  true
                )
              }
              onMouseLeave={() =>
                handleCardHover(
                  i,
                  false
                )
              }
              onFocus={() =>
                handleCardHover(
                  i,
                  true
                )
              }
              onBlur={() =>
                handleCardHover(
                  i,
                  false
                )
              }
              aria-label={
                product.name
              }
            >
              {/* Fallback image for flat/reduced-motion */}
              <img
                className="fb"
                src={
                  product.images[0] ||
                  `/assets/products/product-${i + 1}-main.jpg`
                }
                alt={
                  product.name
                }
              />

              {/* Close-up detail image revealed on hover */}
              <img
                className="hv"
                src={
                  product.images[1] ||
                  `/assets/products/product-${i + 1}-detail.jpg`
                }
                alt=""
                aria-hidden="true"
              />

              <div className="lbl">
                <span
                  className="sm"
                  style={{
                    color:
                      'var(--au)',
                  }}
                >
                  0{i + 1}
                </span>

                <h3>
                  {product.name}
                </h3>

                <span>
                  £{product.price}
                </span>
              </div>
            </a>
          )
        )}

        {/* Pure Black Layer (#bk) */}
        <div
          className="bk"
          id="bk"
          ref={bkRef}
        />

        {/* Hero Banner (#bn) */}
        <div
          className="bn"
          id="bn"
          ref={bnRef}
        >
          <img
            src="/assets/banner.jpg"
            alt="Global Luxury Emporium - premium leather jackets for men and women"
          />
        </div>

        {/* Intro Statement (#in0) */}
        <div
          id="in0"
          ref={in0Ref}
        >
          <p>
            Designed in London. Made
            in our own factory in
            Pakistan. Shipped
            worldwide.
          </p>

          <a
            className="lk sm"
            href="#shop"
            onClick={
              handleScrollToShop
            }
          >
            View the collection{' '}
            <b>&rarr;</b>
          </a>
        </div>

        {/* Section Title (#ttl) */}
        <div
          id="ttl"
          ref={ttlRef}
        >
          <div
            className="sm"
            style={{
              color:
                'var(--au)',
            }}
          >
            Collection
          </div>

          <h2>
            The jackets
          </h2>
        </div>

        {/* Model Cutout Layers (.mo) */}
        {MODELS.map(
          (model, i) => (
            <div
              key={i}
              ref={(el) =>
                (moRefs.current[i] =
                  el)
              }
              className="mo"
              style={{
                width:
                  `${model.w}px`,
                height:
                  `${model.h}px`,
                willChange:
                  'transform, opacity',
                backfaceVisibility:
                  'hidden',
                WebkitBackfaceVisibility:
                  'hidden',
              }}
            >
              <img
                src={model.file}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height:
                    '100%',
                  display:
                    'block',
                }}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
};