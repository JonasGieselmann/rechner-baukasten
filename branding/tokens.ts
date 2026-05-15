// Single source of truth for design tokens used by the customer surfaces.
// Exported separately from src/types so non-React tools (puppeteer PDF
// template, external dashboards) can consume the same values.

export const BRAND = {
  colors: {
    background: '#ffffff',
    card: '#f7f7f8',
    text: '#0a0a0a',
    primary: '#0a0a0a',
    accent: '#7EC8F3',
    border: '#e6e8eb',
  },
  radii: {
    card: '1rem',
    pill: '9999px',
  },
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
