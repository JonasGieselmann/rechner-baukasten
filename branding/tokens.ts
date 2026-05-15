// Single source of truth for the BeautyFlow customer surface design tokens.
// Updated 2026-05-15 to reflect the final brand system delivered by the user.
// Mirrored into src/types/index.ts DEFAULT_FUNNEL_THEME.

export const BRAND = {
  colors: {
    background: '#F7FAFF', // Porzellan-Weiß
    card: '#FFFFFF',
    text: '#0F2F5B', // Deep Navy
    primary: '#0F2F5B', // CTAs background
    accent: '#7EC8F3', // Light Blue
    dark: '#04070D', // Charcoal Black, admin-chrome only
    border: '#E0E7F2', // subtle navy-tinted border
    muted: '#5A7090', // muted navy for secondary text
  },
  fonts: {
    sans: '"Inter", system-ui, -apple-system, sans-serif',
    serif: '"Instrument Serif", "Inter", serif',
  },
  radii: {
    card: '1rem',
    pill: '9999px',
  },
  voice: 'Sie',
  spiderDimensions: [
    'Social Media',
    'Website',
    'Branding',
    'Trust',
    'Auffindbarkeit',
    'Umsatzpotenzial',
    'Mitarbeiter',
    'Regionales Potenzial',
  ],
} as const;
