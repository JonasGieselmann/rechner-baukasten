// Single source of truth for design tokens used by the public funnel runner.
// Mirror of DEFAULT_FUNNEL_THEME but exported separately for non-React tools
// (e.g. the puppeteer PDF template in Release 3, or external dashboards).

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
