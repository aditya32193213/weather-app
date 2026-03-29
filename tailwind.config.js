/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: 'var(--surface)',
        'surface-solid': 'var(--surface-solid)',
        'surface-border': 'var(--surface-border)',
        glass: 'var(--glass)',
        'glass-border': 'var(--glass-border)',
        divider: 'var(--divider)',
        skeleton: 'var(--skeleton-bg)',
        'nav-bg': 'var(--nav-bg)',
        'nav-border': 'var(--nav-border)',
        'surface-hover': 'var(--surface-hover)',
        'hero-bg': 'var(--hero-bg)',
        'hero-border': 'var(--hero-border)',
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        }
      },
      // FIX (CRITICAL): `bg-skeleton` requires an explicit `backgroundColor`
      // entry — adding `skeleton` only to `colors` is sufficient in most
      // Tailwind v3 setups, but the explicit entry below guarantees the utility
      // is generated even in JIT environments that purge ambiguous color tokens.
      // Without this, `bg-skeleton` is a no-op: the skeleton loader renders as
      // a transparent pulsing div with zero visual feedback on first load.
      backgroundColor: {
        skeleton: 'var(--skeleton-bg)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(18px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        }
      }
    },
  },
  plugins: [],
}