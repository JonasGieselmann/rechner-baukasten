import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';

const STORAGE_KEY = 'bf-cookie-notice-ack';

// The portal sets only strictly necessary session cookies (better-auth), so no
// consent gate is legally required (TDDDG/DSGVO). This is a transparent,
// dismissible information notice with no dark patterns and no tracking.
export function CookieNotice() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  // Do not show on embeddable funnel/calculator surfaces (those are embedded on
  // third-party sites that provide their own consent UI).
  const suppressed = pathname.startsWith('/funnel') || pathname.startsWith('/embed');
  if (!visible || suppressed) return null;

  const acknowledge = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore storage errors (private mode)
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 border-t"
      style={{
        backgroundColor: `${BRAND.colors.card}F7`,
        borderColor: BRAND.colors.border,
        backdropFilter: 'saturate(180%) blur(12px)',
        WebkitBackdropFilter: 'saturate(180%) blur(12px)',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
      }}
      role="region"
      aria-label="Cookie-Hinweis"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
        <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.text }}>
          Wir verwenden ausschließlich technisch notwendige Cookies, damit Ihre Anmeldung
          funktioniert. Es findet kein Tracking statt. Mehr dazu in unserer{' '}
          <Link to="/datenschutz" className="underline" style={{ color: BRAND.colors.primary }}>
            Datenschutzerklärung
          </Link>
          .
        </p>
        <button
          onClick={acknowledge}
          className="shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
