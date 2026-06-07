import { Link } from 'react-router-dom';
import { BRAND } from '../../branding/tokens';
import { Wordmark } from './Wordmark';
import { Footer } from './Footer';
import type { LegalDoc } from '../lib/legalContent';

// Generic renderer for the public legal pages (Impressum, Datenschutz, AGB).
export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: BRAND.colors.background, color: BRAND.colors.text }}
    >
      <header
        className="flex items-center justify-between px-4 py-4 border-b sticky top-0 z-10"
        style={{ borderColor: BRAND.colors.border, backgroundColor: BRAND.colors.background }}
      >
        <Link to="/" aria-label="Zur Startseite">
          <Wordmark size="md" />
        </Link>
        <Link
          to="/"
          className="text-sm transition-opacity hover:opacity-70"
          style={{ color: BRAND.colors.muted }}
        >
          Zurück
        </Link>
      </header>

      <main className="flex-1 px-4 py-10">
        <article className="max-w-3xl mx-auto space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>
              {doc.title}
            </h1>
            {doc.intro && (
              <p className="text-sm leading-relaxed" style={{ color: BRAND.colors.muted }}>
                {doc.intro}
              </p>
            )}
            <p className="text-xs" style={{ color: BRAND.colors.muted }}>
              {doc.lastUpdated}
            </p>
          </div>

          {doc.sections.map((section) => (
            <section key={section.heading} className="space-y-2">
              <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                {section.heading}
              </h2>
              {section.body.map((paragraph, idx) => (
                <p
                  key={idx}
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: BRAND.colors.muted }}
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>

      <Footer />
    </div>
  );
}
