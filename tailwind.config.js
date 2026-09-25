/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--iv, #F7F3EA)',
        ivory: 'var(--iv, #F7F3EA)',
        text: 'var(--ink, #141210)',
        muted: 'var(--mu, #6D6558)',
        hairline: 'var(--ln, #DDD5C4)',
        gold: {
          DEFAULT: 'var(--au, #9A7628)',
          dark: 'var(--au, #7A5A1A)',
          light: 'var(--au2, #C9A24A)',
          accent: 'var(--au2, #B98D35)',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-btn': 'linear-gradient(135deg, #A9812F, #F3DC9B 50%, #B98D35)',
        'gold-btn-hover': 'linear-gradient(135deg, #B98D35, #F7E5B3 50%, #C89C40)',
        'heading-gold': 'linear-gradient(100deg, #6B4E14, #B08A35 45%, #8A6A1F 70%, #5C420F)',
        'announcement-gold': 'linear-gradient(90deg, #8C6A22, #ECD48F, #8C6A22)',
      },
      boxShadow: {
        'gold-pill': '0 6px 24px rgba(154, 118, 40, 0.25)',
        'luxury-card': '0 8px 30px rgba(29, 24, 16, 0.06)',
      },
    },
  },
  plugins: [],
}
