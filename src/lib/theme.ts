export interface ColorTheme {
  name?: string;
  primary: string;    // --au  (Gold accent / buttons)
  secondary: string;  // --au2 (Hover gold)

  // ─── Middle: page canvas & typography ────────────────────────────
  background: string; // --iv  (Main page canvas)
  text: string;       // --ink (Headings & body text)
  muted: string;      // --mu  (Secondary / meta text)
  border: string;     // --ln  (Dividers & hairline borders)

  // ─── Top: header & announcement bar ──────────────────────────────
  topBackground?: string; // --top-bg   (Header & announce bar bg)
  topText?: string;       // --top-text (Header text & nav links)

  // ─── Bottom: footer ───────────────────────────────────────────────
  bottomBackground?: string; // --bottom-bg   (Footer background)
  bottomText?: string;       // --bottom-text (Footer text & links)
}

export const DEFAULT_THEME: ColorTheme = {
  name: 'Classic Atelier Gold & Warm Ivory',
  primary:    '#9A7628',
  secondary:  '#C9A24A',
  background: '#F7F3EA',
  text:       '#141210',
  muted:      '#6D6558',
  border:     '#DDD5C4',
  topBackground:    '#F7F3EA',
  topText:          '#141210',
  bottomBackground: '#0E0D0B',
  bottomText:       '#A89F8B',
};

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  theme: ColorTheme;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'classic_gold',
    label: 'Classic Gold & Warm Ivory',
    description: 'The signature warm ivory palette with antique gold and black obsidian footer.',
    theme: {
      name: 'Classic Gold & Warm Ivory',
      primary: '#9A7628', secondary: '#C9A24A',
      background: '#F7F3EA', text: '#141210', muted: '#6D6558', border: '#DDD5C4',
      topBackground: '#F7F3EA', topText: '#141210',
      bottomBackground: '#0E0D0B', bottomText: '#A89F8B',
    },
  },
  {
    id: 'champagne_linen',
    label: 'Champagne & Pure Alabaster',
    description: 'Alabaster white canvas with champagne gold accents and espresso footer.',
    theme: {
      name: 'Champagne & Pure Alabaster',
      primary: '#B38933', secondary: '#D4AD55',
      background: '#FAF8F4', text: '#1A1815', muted: '#7A7264', border: '#E8E2D6',
      topBackground: '#FAF8F4', topText: '#1A1815',
      bottomBackground: '#181614', bottomText: '#B8B0A2',
    },
  },
  {
    id: 'mayfair_navy',
    label: 'Mayfair Navy & Regal Gold',
    description: 'Crisp frost canvas with navy header & footer and regal gold typography.',
    theme: {
      name: 'Mayfair Navy & Regal Gold',
      primary: '#B58B2E', secondary: '#D8B35A',
      background: '#F5F7FA', text: '#0D1B2A', muted: '#4A5B70', border: '#D3DAE4',
      topBackground: '#0D1B2A', topText: '#FFFFFF',
      bottomBackground: '#08101A', bottomText: '#A0B0C4',
    },
  },
  {
    id: 'oxblood_burgundy',
    label: 'Oxblood Biker & Rose Bronze',
    description: 'Soft blush canvas with cabernet header & footer and rose bronze accents.',
    theme: {
      name: 'Oxblood Biker & Rose Bronze',
      primary: '#9E5050', secondary: '#C27575',
      background: '#FAF5F5', text: '#261317', muted: '#73585C', border: '#E6D3D6',
      topBackground: '#261317', topText: '#F8EFEF',
      bottomBackground: '#1A0B0E', bottomText: '#C4A8AC',
    },
  },
  {
    id: 'racing_green',
    label: 'British Racing Green & Bronze',
    description: 'Heritage estate-green header & footer with bronze metallic highlights.',
    theme: {
      name: 'British Racing Green & Bronze',
      primary: '#8A6538', secondary: '#B58A4E',
      background: '#F4F7F4', text: '#102417', muted: '#526658', border: '#D0DCD2',
      topBackground: '#102417', topText: '#F0F5F1',
      bottomBackground: '#0A170F', bottomText: '#A0B8A6',
    },
  },
  {
    id: 'midnight_noir',
    label: 'Midnight Noir & Gold (Dark Luxury)',
    description: 'Obsidian dark canvas & header with brilliant warm gold highlights.',
    theme: {
      name: 'Midnight Noir & Gold',
      primary: '#D4AF37', secondary: '#F5DF88',
      background: '#121110', text: '#F5F2EB', muted: '#9E978C', border: '#2E2A24',
      topBackground: '#121110', topText: '#F5F2EB',
      bottomBackground: '#0A0908', bottomText: '#9E978C',
    },
  },
];

/**
 * Apply the full color theme to the document instantly.
 * Sets CSS variables on :root (cascade) + direct inline styles on
 * html / body / #root for immediate repaint, and caches to localStorage
 * so the next page load has zero flash.
 */
export function applyThemeToDocument(theme?: Partial<ColorTheme> | null) {
  if (typeof document === 'undefined') return;
  const t = { ...DEFAULT_THEME, ...(theme || {}) };
  const root = document.documentElement;

  const topBg    = t.topBackground    ?? t.background;
  const topTxt   = t.topText          ?? t.text;
  const botBg    = t.bottomBackground ?? '#0E0D0B';
  const botTxt   = t.bottomText       ?? '#A89F8B';

  // ── Middle: page canvas ──────────────────────────────────────────
  root.style.setProperty('--iv',  t.background);
  root.style.setProperty('--ink', t.text);
  root.style.setProperty('--mu',  t.muted);
  root.style.setProperty('--ln',  t.border);
  root.style.setProperty('--au',  t.primary);
  root.style.setProperty('--au2', t.secondary);
  root.style.setProperty('--ph',  t.background);

  // ── Top: header & announce bar ───────────────────────────────────
  root.style.setProperty('--top-bg',   topBg);
  root.style.setProperty('--top-text', topTxt);

  // ── Bottom: footer ───────────────────────────────────────────────
  root.style.setProperty('--bottom-bg',   botBg);
  root.style.setProperty('--bottom-text', botTxt);

  // ── Direct inline overrides for instant repaint ──────────────────
  root.style.backgroundColor = t.background;
  root.style.color = t.text;
  if (document.body) {
    document.body.style.backgroundColor = t.background;
    document.body.style.color = t.text;
  }
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.style.backgroundColor = t.background;
    rootEl.style.color = t.text;
  }

  // ── Cache for zero-flash on next page load ───────────────────────
  try { localStorage.setItem('gle_color_theme', JSON.stringify(t)); } catch { /* noop */ }
}

/**
 * Reads cached theme from localStorage and applies it immediately.
 * Call this before mounting React to avoid flash of default colours.
 */
export function initThemeFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('gle_color_theme');
    if (raw) applyThemeToDocument(JSON.parse(raw));
  } catch { /* fall back to CSS default */ }
}
