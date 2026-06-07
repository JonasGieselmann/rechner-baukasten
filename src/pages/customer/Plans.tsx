import { useEffect, useState } from 'react';
import { BRAND } from '../../../branding/tokens';

interface Package {
  id: string;
  name: string;
  description: string;
  features: string[];
}

const CONTACT = 'mailto:kocak@aksme.de?subject=BeautyFlow%20Paket';

export default function Plans() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/packages', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setPackages(d))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>
          Pakete
        </h1>
        <p className="text-base" style={{ color: BRAND.colors.muted }}>
          Wählen Sie das passende Paket für Ihr Wachstum. Bei Fragen oder zum Upgrade melden wir uns persönlich.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: BRAND.colors.muted }}>Laden...</p>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl border p-6" style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}>
          <p className="text-sm" style={{ color: BRAND.colors.muted }}>
            Aktuell sind keine Pakete hinterlegt. Sprechen Sie uns für ein passendes Angebot an.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border p-6 flex flex-col gap-3"
              style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
            >
              <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                {p.name}
              </h2>
              {p.description && (
                <p className="text-sm" style={{ color: BRAND.colors.muted }}>
                  {p.description}
                </p>
              )}
              <ul className="space-y-1 flex-1">
                {(p.features ?? []).map((f, i) => (
                  <li key={`${p.id}-${i}`} className="text-sm flex items-start gap-2" style={{ color: BRAND.colors.text }}>
                    <span style={{ color: BRAND.colors.accent }}>&#x2713;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href={CONTACT}
                className="text-center px-5 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
              >
                Upgrade anfragen
              </a>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-center" style={{ color: BRAND.colors.muted }}>
        Fragen zu den Paketen? Schreiben Sie uns an kocak@aksme.de.
      </p>
    </div>
  );
}
