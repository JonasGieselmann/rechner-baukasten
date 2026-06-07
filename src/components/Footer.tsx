import { Link } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';
import { LEGAL_FOOTER_LINKS } from '../lib/legalContent';

// Public footer with the legally required links (Impressum, Datenschutz, AGB).
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t py-6 px-4" style={{ borderColor: BRAND.colors.border }}>
      <div
        className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm"
        style={{ color: BRAND.colors.muted }}
      >
        <span>&copy; {year} Alen Media Solutions GmbH</span>
        <nav className="flex items-center gap-4 flex-wrap justify-center">
          {LEGAL_FOOTER_LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="transition-opacity hover:opacity-70"
              style={{ color: BRAND.colors.muted }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
