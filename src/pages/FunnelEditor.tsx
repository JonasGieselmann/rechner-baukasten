import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFunnelStore } from '../store/funnelStore';
import type { FunnelStep, FunnelStepType, LeadCaptureStep, QuestionStep, IntroStep, CalcInputStep, ResultSpiderStep, CtaBookingStep, SpiderDimension } from '../types';
import { SPIDER_DIMENSIONS, DEFAULT_LEAD_FIELDS } from '../types';

const STEP_TYPES: { type: FunnelStepType; label: string }[] = [
  { type: 'intro', label: 'Intro' },
  { type: 'lead-capture', label: 'Lead-Capture' },
  { type: 'question', label: 'Frage' },
  { type: 'calc-input', label: 'Kalku-Input' },
  { type: 'result-spider', label: 'Ergebnis (Spider)' },
  { type: 'cta-booking', label: 'CTA Termin' },
];

export function FunnelEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    current,
    isDirty,
    isSaving,
    loadFunnel,
    saveCurrent,
    updateCurrentMeta,
    addStep,
    updateStep,
    deleteStep,
    selectedStepId,
    selectStep,
    updateSettings,
  } = useFunnelStore();

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadFunnel(id).catch((err) => setLoadError(err instanceof Error ? err.message : 'Load failed'));
  }, [id, loadFunnel]);

  useEffect(() => {
    if (!isDirty) return;
    const t = setTimeout(() => {
      void saveCurrent();
    }, 1500);
    return () => clearTimeout(t);
  }, [isDirty, current, saveCurrent]);

  if (loadError) {
    return <div className="p-10 text-red-400">Fehler: {loadError}</div>;
  }
  if (!current) {
    return <div className="p-10 text-[#6b7a90]">Lädt...</div>;
  }

  const steps = current.config.steps;
  const selected = steps.find((s) => s.id === selectedStepId) ?? null;
  const publicUrl = `${window.location.origin}/funnel/${current.slug}`;

  return (
    <div className="min-h-screen bg-[#04070d] text-white">
      <header className="border-b border-[#1a1f2e] bg-[#0a0d12] px-6 py-3 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-[#6b7a90] hover:text-white">
          ← Funnels
        </button>
        <input
          value={current.name}
          onChange={(e) => updateCurrentMeta({ name: e.target.value })}
          className="bg-transparent text-lg font-semibold outline-none border-b border-transparent hover:border-[#1a1f2e] focus:border-[#7EC8F3] px-1"
        />
        <span className={`text-xs px-2 py-1 rounded-full ${current.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-[#1a1f2e] text-[#6b7a90]'}`}>
          {current.status}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-[#6b7a90]">{isSaving ? 'Speichert...' : isDirty ? 'Ungespeichert' : 'Gespeichert'}</span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7EC8F3] hover:underline">
            Vorschau ↗
          </a>
          <select
            value={current.status}
            onChange={(e) => updateCurrentMeta({ status: e.target.value as 'draft' | 'published' | 'archived' })}
            className="bg-[#1a1f2e] border border-[#2a3142] rounded px-2 py-1 text-sm"
          >
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="archived">Archiviert</option>
          </select>
        </div>
      </header>

      <div className="grid grid-cols-[280px_1fr_360px] min-h-[calc(100vh-49px)]">
        {/* Left: steps list + palette */}
        <aside className="border-r border-[#1a1f2e] p-4 overflow-y-auto">
          <h3 className="text-xs uppercase tracking-wider text-[#6b7a90] mb-2">Schritte</h3>
          <ol className="space-y-1 mb-6">
            {steps.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => selectStep(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                    selected?.id === s.id ? 'bg-[#7EC8F3]/10 text-[#7EC8F3]' : 'hover:bg-[#1a1f2e] text-[#b8c7d9]'
                  }`}
                >
                  <span className="text-[#6b7a90] mr-2">{i + 1}.</span>
                  {labelForStep(s)}
                </button>
              </li>
            ))}
            {steps.length === 0 && <li className="text-xs text-[#6b7a90]">Noch keine Schritte. Unten hinzufügen.</li>}
          </ol>

          <h3 className="text-xs uppercase tracking-wider text-[#6b7a90] mb-2">Hinzufügen</h3>
          <div className="grid grid-cols-1 gap-1">
            {STEP_TYPES.map((t) => (
              <button
                key={t.type}
                onClick={() => addStep(t.type)}
                className="text-left px-3 py-2 rounded-lg bg-[#10131c] hover:bg-[#1a1f2e] text-sm text-[#b8c7d9]"
              >
                + {t.label}
              </button>
            ))}
          </div>

          <h3 className="text-xs uppercase tracking-wider text-[#6b7a90] mb-2 mt-6">Einstellungen</h3>
          <label className="flex items-center gap-2 text-sm text-[#b8c7d9] mb-2">
            <input
              type="checkbox"
              checked={current.config.settings.progressBar}
              onChange={(e) => updateSettings({ progressBar: e.target.checked })}
            />
            Progressbar anzeigen
          </label>
          <label className="block text-xs text-[#6b7a90] mb-1">Cal.com URL</label>
          <input
            value={current.config.settings.ctaCalendarUrl}
            onChange={(e) => updateSettings({ ctaCalendarUrl: e.target.value })}
            placeholder="https://cal.com/..."
            className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-sm"
          />
        </aside>

        {/* Center: preview of selected step */}
        <section className="p-10 overflow-y-auto bg-[#070a11]">
          {selected ? (
            <div className="max-w-xl mx-auto bg-white text-[#0a0a0a] rounded-2xl p-8 shadow-sm">
              <StepPreview step={selected} />
            </div>
          ) : (
            <div className="text-[#6b7a90] text-center mt-20">Wähle links einen Schritt zum Bearbeiten.</div>
          )}
        </section>

        {/* Right: properties */}
        <aside className="border-l border-[#1a1f2e] p-4 overflow-y-auto">
          {selected ? (
            <StepProperties step={selected} onChange={(u) => updateStep(selected.id, u)} onDelete={() => deleteStep(selected.id)} />
          ) : (
            <div className="text-[#6b7a90] text-sm">Kein Schritt ausgewählt.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

function labelForStep(s: FunnelStep): string {
  if (s.type === 'intro') return s.title || 'Intro';
  if (s.type === 'lead-capture') return s.title || 'Lead-Capture';
  if (s.type === 'question') return s.question || 'Frage';
  if (s.type === 'calc-input') return s.label || 'Kalku-Input';
  if (s.type === 'result-spider') return s.title || 'Ergebnis';
  if (s.type === 'cta-booking') return s.title || 'CTA';
  return 'Schritt';
}

function StepPreview({ step }: { step: FunnelStep }) {
  if (step.type === 'intro') {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-3">{step.title}</h1>
        <p className="text-[#4a5565] mb-6">{step.body}</p>
        <button className="bg-[#0a0a0a] text-white px-6 py-3 rounded-xl">{step.ctaLabel || 'Weiter'}</button>
      </div>
    );
  }
  if (step.type === 'lead-capture') {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
        {step.body && <p className="text-[#4a5565] mb-4">{step.body}</p>}
        <div className="space-y-3">
          {step.fields.map((f) => (
            <input key={f.key} placeholder={f.label} className="w-full border border-[#e6e8eb] rounded-lg px-4 py-3" disabled />
          ))}
        </div>
      </div>
    );
  }
  if (step.type === 'question') {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">{step.question}</h2>
        <div className="space-y-2">
          {step.options.map((o) => (
            <div key={o.id} className="border border-[#e6e8eb] rounded-xl px-4 py-3 text-[#0a0a0a]">
              {o.label} <span className="text-xs text-[#6b7a90] ml-2">({o.score})</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (step.type === 'calc-input') {
    return (
      <div>
        <label className="block text-sm font-medium mb-2">{step.label}</label>
        <input type="number" defaultValue={step.defaultValue} className="w-full border border-[#e6e8eb] rounded-lg px-4 py-3" disabled />
      </div>
    );
  }
  if (step.type === 'result-spider') {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
        <p className="text-[#4a5565] mb-4">{step.body}</p>
        <div className="bg-[#f7f7f8] rounded-xl p-6 text-center text-[#6b7a90]">[Spider-Web Vorschau]</div>
      </div>
    );
  }
  if (step.type === 'cta-booking') {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
        <p className="text-[#4a5565] mb-4">{step.body}</p>
        <button className="bg-[#7EC8F3] text-[#0a0a0a] px-6 py-3 rounded-xl font-medium">{step.ctaLabel}</button>
      </div>
    );
  }
  return null;
}

function StepProperties({ step, onChange, onDelete }: { step: FunnelStep; onChange: (u: Partial<FunnelStep>) => void; onDelete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Eigenschaften</h3>
        <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-300">Löschen</button>
      </div>
      <Field label="Typ">
        <div className="text-xs px-2 py-1 rounded bg-[#1a1f2e] inline-block">{step.type}</div>
      </Field>
      {(step.type === 'intro' || step.type === 'lead-capture' || step.type === 'result-spider' || step.type === 'cta-booking') && (
        <>
          <Field label="Titel">
            <TextInput value={step.title ?? ''} onChange={(v) => onChange({ title: v } as Partial<FunnelStep>)} />
          </Field>
          <Field label="Body">
            <TextArea value={step.body ?? ''} onChange={(v) => onChange({ body: v } as Partial<FunnelStep>)} />
          </Field>
        </>
      )}
      {step.type === 'intro' && (
        <Field label="CTA Label">
          <TextInput value={(step as IntroStep).ctaLabel ?? ''} onChange={(v) => onChange({ ctaLabel: v } as Partial<IntroStep>)} />
        </Field>
      )}
      {step.type === 'lead-capture' && (
        <Field label="Felder">
          <div className="space-y-1">
            {DEFAULT_LEAD_FIELDS.map((df) => {
              const lc = step as LeadCaptureStep;
              const enabled = lc.fields.some((f) => f.key === df.key);
              return (
                <label key={df.key} className="flex items-center gap-2 text-xs text-[#b8c7d9]">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...lc.fields, df]
                        : lc.fields.filter((f) => f.key !== df.key);
                      onChange({ fields: next } as Partial<LeadCaptureStep>);
                    }}
                  />
                  {df.label}
                </label>
              );
            })}
          </div>
        </Field>
      )}
      {step.type === 'question' && (
        <>
          <Field label="Frage">
            <TextArea value={(step as QuestionStep).question} onChange={(v) => onChange({ question: v } as Partial<QuestionStep>)} />
          </Field>
          <Field label="Dimension">
            <select
              value={(step as QuestionStep).dimension}
              onChange={(e) => onChange({ dimension: e.target.value as SpiderDimension } as Partial<QuestionStep>)}
              className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-sm"
            >
              {SPIDER_DIMENSIONS.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Antwort-Optionen">
            <div className="space-y-2">
              {(step as QuestionStep).options.map((opt, idx) => (
                <div key={opt.id} className="flex gap-2">
                  <input
                    value={opt.label}
                    onChange={(e) => {
                      const next = [...(step as QuestionStep).options];
                      next[idx] = { ...opt, label: e.target.value };
                      onChange({ options: next } as Partial<QuestionStep>);
                    }}
                    className="flex-1 bg-[#1a1f2e] border border-[#2a3142] rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={opt.score}
                    onChange={(e) => {
                      const next = [...(step as QuestionStep).options];
                      next[idx] = { ...opt, score: Math.max(0, Math.min(100, Number(e.target.value) || 0)) };
                      onChange({ options: next } as Partial<QuestionStep>);
                    }}
                    className="w-16 bg-[#1a1f2e] border border-[#2a3142] rounded px-2 py-1 text-xs"
                  />
                  <button
                    onClick={() => {
                      const next = (step as QuestionStep).options.filter((_, i) => i !== idx);
                      onChange({ options: next } as Partial<QuestionStep>);
                    }}
                    className="text-red-400 text-xs px-2"
                  >×</button>
                </div>
              ))}
              <button
                onClick={() => {
                  const opts = (step as QuestionStep).options;
                  const next = [...opts, { id: `o${opts.length + 1}-${Math.random().toString(36).slice(2, 6)}`, label: `Antwort ${opts.length + 1}`, score: 50 }];
                  onChange({ options: next } as Partial<QuestionStep>);
                }}
                className="text-xs text-[#7EC8F3] hover:underline"
              >+ Option hinzufügen</button>
            </div>
          </Field>
        </>
      )}
      {step.type === 'calc-input' && (
        <>
          <Field label="Label">
            <TextInput value={(step as CalcInputStep).label} onChange={(v) => onChange({ label: v } as Partial<CalcInputStep>)} />
          </Field>
          <Field label="Variable">
            <TextInput value={(step as CalcInputStep).variableName} onChange={(v) => onChange({ variableName: v.replace(/[^a-zA-Z0-9_]/g, '') } as Partial<CalcInputStep>)} />
          </Field>
          <Field label="Default">
            <input
              type="number"
              value={(step as CalcInputStep).defaultValue}
              onChange={(e) => onChange({ defaultValue: Number(e.target.value) } as Partial<CalcInputStep>)}
              className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-sm"
            />
          </Field>
        </>
      )}
      {step.type === 'result-spider' && (
        <Field label="Cliffhanger">
          <TextArea value={(step as ResultSpiderStep).cliffhanger ?? ''} onChange={(v) => onChange({ cliffhanger: v } as Partial<ResultSpiderStep>)} />
        </Field>
      )}
      {step.type === 'cta-booking' && (
        <>
          <Field label="CTA Label">
            <TextInput value={(step as CtaBookingStep).ctaLabel} onChange={(v) => onChange({ ctaLabel: v } as Partial<CtaBookingStep>)} />
          </Field>
          <Field label="Cal.com URL">
            <TextInput value={(step as CtaBookingStep).calendarUrl} onChange={(v) => onChange({ calendarUrl: v } as Partial<CtaBookingStep>)} />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-[#6b7a90] mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-sm text-white"
    />
  );
}

function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full bg-[#1a1f2e] border border-[#2a3142] rounded px-3 py-2 text-sm text-white resize-none"
    />
  );
}
