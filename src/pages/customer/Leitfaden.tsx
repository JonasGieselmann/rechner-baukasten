import { BRAND } from '../../../branding/tokens';
import { renderTitleWithItalics } from '../../lib/textFormat';

interface Kapitel {
  nr: number;
  title: string;
}

const KAPITEL: Kapitel[] = [
  { nr: 1, title: 'Customer Journey' },
  { nr: 2, title: 'Angebot & Positionierung' },
  { nr: 3, title: 'Kapazität & Prozesse' },
  { nr: 4, title: 'Skalierung' },
];

function LockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="flex-shrink-0"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function Leitfaden() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div
        className="rounded-2xl border p-6 space-y-6"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: BRAND.colors.text }}>
          {renderTitleWithItalics('BeautyFlow *Leitfaden*')}
        </h1>

        <p className="text-base leading-relaxed" style={{ color: BRAND.colors.text }}>
          Wir bereiten gerade einen ausführlichen Leitfaden für Sie auf, der Ihnen
          Schritt für Schritt zeigt, wie Sie Ihre Praxis strukturiert und mit System
          wachsen lassen.
        </p>

        <div className="space-y-2">
          {KAPITEL.map((k) => (
            <div
              key={k.nr}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ backgroundColor: BRAND.colors.background, borderColor: BRAND.colors.border }}
            >
              <LockIcon />
              <span className="text-sm font-medium opacity-50" style={{ color: BRAND.colors.text }}>
                {k.nr}. {k.title}
              </span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 self-start"
            style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
            onClick={() => alert('Notiert')}
          >
            Bei Veröffentlichung benachrichtigen
            <span aria-hidden="true">&#x21AA;</span>
          </button>

          <a
            href="https://beauty-flow.de/blueprint"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm transition-opacity hover:opacity-70 self-start"
            style={{ color: BRAND.colors.muted }}
          >
            Vorab das öffentliche Whitepaper lesen &#x2192;
          </a>
        </div>
      </div>
    </div>
  );
}
