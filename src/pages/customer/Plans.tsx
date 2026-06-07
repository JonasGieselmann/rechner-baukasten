import { useEffect, useState } from 'react';
import { BRAND } from '../../../branding/tokens';

interface Plan {
  id: string;
  name: string;
  description: string;
  price_label: string;
  max_funnels: number;
  features: string[];
}
interface MyPlan {
  plan: Plan | null;
  usage: { funnels: number };
}

const CONTACT = 'mailto:kocak@aksme.de?subject=BeautyFlow%20Upgrade';

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mine, setMine] = useState<MyPlan | null>(null);

  useEffect(() => {
    fetch('/api/plans', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setPlans(d))
      .catch(() => undefined);
    fetch('/api/plans/me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMine)
      .catch(() => undefined);
  }, []);

  const currentId = mine?.plan?.id;
  const limit = mine?.plan?.max_funnels ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold" style={{ color: BRAND.colors.text }}>
          Ihr Plan
        </h1>
        <p className="text-base" style={{ color: BRAND.colors.muted }}>
          {mine?.plan
            ? `Aktuell: ${mine.plan.name} (${mine.plan.price_label}). ${mine.usage.funnels} Funnel${
                mine.usage.funnels === 1 ? '' : 's'
              } in Nutzung${limit > 0 ? ` von ${limit}` : ''}.`
            : 'Wählen Sie den passenden Plan für Ihr Wachstum.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentId;
          return (
            <div
              key={p.id}
              className="rounded-2xl border p-6 flex flex-col gap-3"
              style={{
                backgroundColor: BRAND.colors.card,
                borderColor: isCurrent ? BRAND.colors.accent : BRAND.colors.border,
                borderWidth: isCurrent ? 2 : 1,
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: BRAND.colors.text }}>
                  {p.name}
                </h2>
                {isCurrent && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${BRAND.colors.accent}33`, color: BRAND.colors.primary }}
                  >
                    Aktuell
                  </span>
                )}
              </div>
              <p className="text-2xl font-semibold" style={{ color: BRAND.colors.text }}>
                {p.price_label}
              </p>
              <p className="text-sm" style={{ color: BRAND.colors.muted }}>
                {p.description}
              </p>
              <ul className="space-y-1 flex-1">
                {(p.features ?? []).map((f) => (
                  <li key={f} className="text-sm flex items-start gap-2" style={{ color: BRAND.colors.text }}>
                    <span style={{ color: BRAND.colors.accent }}>&#x2713;</span>
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-sm text-center py-2" style={{ color: BRAND.colors.muted }}>
                  Ihr aktueller Plan
                </span>
              ) : (
                <a
                  href={CONTACT}
                  className="text-center px-5 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
                >
                  Upgrade anfragen
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center" style={{ color: BRAND.colors.muted }}>
        Fragen zu den Plänen? Schreiben Sie uns an kocak@aksme.de.
      </p>
    </div>
  );
}
