/** @type {import('tailwindcss').Config} */
export default {
  // Incremental adoption: utilities are opt-in. Preflight is disabled below so
  // existing Material Web / hand-written CSS pages are NOT affected.
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Wire Tailwind dark: variant to the site's existing theme attribute.
  darkMode: ['selector', '[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--sc-border))',
        input: 'hsl(var(--sc-input))',
        ring: 'hsl(var(--sc-ring))',
        background: 'hsl(var(--sc-background))',
        foreground: 'hsl(var(--sc-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--sc-primary))',
          foreground: 'hsl(var(--sc-primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--sc-secondary))',
          foreground: 'hsl(var(--sc-secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--sc-muted))',
          foreground: 'hsl(var(--sc-muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--sc-accent))',
          foreground: 'hsl(var(--sc-accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--sc-card))',
          foreground: 'hsl(var(--sc-card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--sc-radius)',
        md: 'calc(var(--sc-radius) - 2px)',
        sm: 'calc(var(--sc-radius) - 4px)',
      },
      keyframes: {
        'sc-fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'sc-fade-up': 'sc-fade-up 0.4s ease both',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
