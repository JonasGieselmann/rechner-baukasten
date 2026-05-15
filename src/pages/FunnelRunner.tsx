import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { getFunnelBySlug, submitFunnelLead } from '../lib/funnelApi';
import type { LeadSubmission } from '../lib/funnelApi';
import type {
  Funnel,
  FunnelStep,
  FunnelTheme,
  LeadField,
  SpiderDimension,
} from '../types';
import { SPIDER_DIMENSIONS, DEFAULT_FUNNEL_THEME } from '../types';

// ---- types local to this module ----

type LeadState = Partial<Record<LeadField, string>>;
type AnswersState = Record<string, string[]>;
type CalcVarsState = Record<string, number>;
type DimScores = Partial<Record<SpiderDimension, number>>;

type RecommendationKey =
  | 'fundament-aufbauen'
  | 'stufe-1'
  | 'stufe-2'
  | 'stufe-3';

const RECOMMENDATION_TEXTS: Record<RecommendationKey, string> = {
  'fundament-aufbauen':
    'Marketing ohne Fundament verbrennt Geld. Erst Social Media, Website und Branding sauber aufbauen, dann skalieren.',
  'stufe-1':
    'Dein Fundament steht. Du bekommst qualifizierte Leads und schließt selbst ab -- maximale Transparenz.',
  'stufe-2':
    'Du bist bereit fuer automatische Buchungen. Wir leiten Interessenten direkt in deinen Kalender.',
  'stufe-3':
    'Du spielst in der Skalierungsliga. Wir uebernehmen alles, du behandelst.',
};

// ---- helpers ----

function readUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const v = params.get(key);
    if (v) utm[key] = v;
  }
  return utm;
}

function computeScores(
  steps: FunnelStep[],
  answers: AnswersState,
): DimScores {
  const buckets: Partial<Record<SpiderDimension, number[]>> = {};

  for (const step of steps) {
    if (step.type !== 'question') continue;
    const selected = answers[step.id] ?? [];
    if (selected.length === 0) continue;
    const scores = step.options
      .filter((o) => selected.includes(o.id))
      .map((o) => o.score);
    if (scores.length === 0) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (!buckets[step.dimension]) buckets[step.dimension] = [];
    buckets[step.dimension]!.push(avg);
  }

  const result: DimScores = {};
  for (const dim of SPIDER_DIMENSIONS) {
    const vals = buckets[dim.key];
    result[dim.key] = vals
      ? vals.reduce((a, b) => a + b, 0) / vals.length
      : 0;
  }
  return result;
}

function computeRecommendation(
  scores: DimScores,
): RecommendationKey {
  const fundament =
    (
      [
        'social-media',
        'website',
        'branding',
        'trust',
        'auffindbarkeit',
      ] as SpiderDimension[]
    )
      .map((d) => scores[d] ?? 0)
      .reduce((a, b) => a + b, 0) / 5;

  let stage: RecommendationKey;
  if (fundament < 40) stage = 'fundament-aufbauen';
  else if (fundament < 60) stage = 'stufe-1';
  else if (fundament < 80) stage = 'stufe-2';
  else stage = 'stufe-3';

  const umsatz = scores['umsatzpotenzial'] ?? 0;
  const mitarbeiter = scores['mitarbeiter'] ?? 0;
  if (umsatz > 70 && mitarbeiter >= 80) {
    if (stage === 'fundament-aufbauen') stage = 'stufe-1';
    else if (stage === 'stufe-1') stage = 'stufe-2';
    else if (stage === 'stufe-2') stage = 'stufe-3';
  }
  return stage;
}

// ---- styled primitives ----

function Card({
  theme,
  children,
}: {
  theme: FunnelTheme;
  children: React.ReactNode;
}) {
  return (
    <div
      className="w-full max-w-xl mx-auto rounded-2xl border shadow-sm p-6 sm:p-10"
      style={{
        backgroundColor: theme.cardColor,
        borderColor: theme.borderColor,
        color: theme.textColor,
      }}
    >
      {children}
    </div>
  );
}

function PrimaryButton({
  label,
  onClick,
  disabled,
  theme,
  href,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  theme: FunnelTheme;
  href?: string;
}) {
  const cls =
    'mt-6 w-full py-3 px-6 rounded-xl font-semibold text-white text-base transition-opacity disabled:opacity-40 cursor-pointer';
  const style = { backgroundColor: theme.accentColor };

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        style={{ ...style, display: 'block', textAlign: 'center' }}
      >
        {label}
      </a>
    );
  }
  return (
    <button className={cls} style={style} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// ---- step renderers ----

function IntroStep({
  step,
  theme,
  onNext,
}: {
  step: Extract<FunnelStep, { type: 'intro' }>;
  theme: FunnelTheme;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {step.title && (
        <h1 className="text-3xl font-bold leading-tight">{step.title}</h1>
      )}
      {step.body && <p className="text-base opacity-80">{step.body}</p>}
      <PrimaryButton
        label={step.ctaLabel ?? 'Los geht es'}
        onClick={onNext}
        theme={theme}
      />
    </div>
  );
}

function LeadCaptureStep({
  step,
  lead,
  onChange,
  onNext,
  theme,
}: {
  step: Extract<FunnelStep, { type: 'lead-capture' }>;
  lead: LeadState;
  onChange: (key: LeadField, value: string) => void;
  onNext: () => void;
  theme: FunnelTheme;
}) {
  const isValid = step.fields
    .filter((f) => f.required)
    .every((f) => {
      const val = lead[f.key] ?? '';
      if (f.key === 'email') return val.includes('@');
      return val.trim().length > 0;
    });

  const inputType = (key: LeadField): string => {
    if (key === 'email') return 'email';
    if (key === 'phone') return 'tel';
    if (key === 'websiteUrl') return 'url';
    return 'text';
  };

  return (
    <div className="flex flex-col gap-4">
      {step.title && (
        <h2 className="text-2xl font-semibold">{step.title}</h2>
      )}
      {step.body && <p className="text-sm opacity-70">{step.body}</p>}
      <div className="flex flex-col gap-3">
        {step.fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-sm font-medium">
              {f.label}
              {f.required && <span className="ml-1 opacity-50">*</span>}
            </label>
            <input
              type={inputType(f.key)}
              value={lead[f.key] ?? ''}
              onChange={(e) => onChange(f.key, e.target.value)}
              className="rounded-lg px-3 py-2 text-sm border outline-none"
              style={{
                backgroundColor: theme.backgroundColor,
                borderColor: theme.borderColor,
                color: theme.textColor,
              }}
            />
          </div>
        ))}
      </div>
      {step.privacyNote && (
        <p className="text-xs opacity-50">{step.privacyNote}</p>
      )}
      <PrimaryButton
        label={step.ctaLabel ?? 'Weiter'}
        onClick={onNext}
        disabled={!isValid}
        theme={theme}
      />
    </div>
  );
}

function QuestionStep({
  step,
  selected,
  onChange,
  onNext,
  theme,
}: {
  step: Extract<FunnelStep, { type: 'question' }>;
  selected: string[];
  onChange: (ids: string[]) => void;
  onNext: () => void;
  theme: FunnelTheme;
}) {
  const isRequired = step.required !== false;
  const isValid = !isRequired || selected.length > 0;

  function toggle(id: string) {
    if (step.allowMultiple) {
      onChange(
        selected.includes(id)
          ? selected.filter((x) => x !== id)
          : [...selected, id],
      );
    } else {
      onChange([id]);
      setTimeout(onNext, 150);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold">{step.question}</h2>
      <div className="flex flex-col gap-2">
        {step.options.map((opt) => {
          const active = selected.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className="w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? theme.accentColor : theme.cardColor,
                borderColor: active ? theme.accentColor : theme.borderColor,
                color: active ? '#ffffff' : theme.textColor,
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {step.allowMultiple && (
        <PrimaryButton
          label="Weiter"
          onClick={onNext}
          disabled={!isValid}
          theme={theme}
        />
      )}
    </div>
  );
}

function CalcInputStep({
  step,
  value,
  onChange,
  onNext,
  theme,
}: {
  step: Extract<FunnelStep, { type: 'calc-input' }>;
  value: number;
  onChange: (v: number) => void;
  onNext: () => void;
  theme: FunnelTheme;
}) {
  const current = value !== undefined ? value : step.defaultValue;
  const isValid = current >= step.min && current <= step.max;

  return (
    <div className="flex flex-col gap-4">
      {step.title && <h2 className="text-2xl font-semibold">{step.title}</h2>}
      <label className="text-sm font-medium">
        {step.label}
        {step.suffix && (
          <span className="ml-1 opacity-60">{step.suffix}</span>
        )}
      </label>
      {step.inputType === 'slider' ? (
        <div className="flex flex-col gap-1">
          <input
            type="range"
            min={step.min}
            max={step.max}
            step={step.step ?? 1}
            value={current}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-current"
            style={{ accentColor: theme.accentColor }}
          />
          <span className="text-sm text-center font-semibold">
            {current}
            {step.suffix ? ` ${step.suffix}` : ''}
          </span>
        </div>
      ) : (
        <input
          type="number"
          min={step.min}
          max={step.max}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
            color: theme.textColor,
          }}
        />
      )}
      <PrimaryButton
        label="Weiter"
        onClick={onNext}
        disabled={!isValid}
        theme={theme}
      />
    </div>
  );
}

function ResultSpiderStep({
  step,
  scores,
  recommendation,
  submitted,
  submitError,
  onRetry,
  theme,
  ctaUrl,
}: {
  step: Extract<FunnelStep, { type: 'result-spider' }>;
  scores: DimScores;
  recommendation: RecommendationKey;
  submitted: boolean;
  submitError: string | null;
  onRetry: () => void;
  theme: FunnelTheme;
  ctaUrl: string;
}) {
  const chartData = SPIDER_DIMENSIONS.map((d) => ({
    subject: d.label,
    score: scores[d.key] ?? 0,
  }));

  return (
    <div className="flex flex-col gap-6">
      {step.title && <h2 className="text-2xl font-semibold">{step.title}</h2>}
      {step.body && <p className="text-sm opacity-70">{step.body}</p>}

      <div className="w-full" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
            <PolarGrid stroke={theme.borderColor} />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: theme.textColor, fontSize: 11 }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke={theme.accentColor}
              fill={theme.accentColor}
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: theme.borderColor,
          backgroundColor: theme.backgroundColor,
        }}
      >
        <p className="text-sm font-medium opacity-60 mb-1">
          Empfehlung
        </p>
        <p className="text-base font-semibold">
          {RECOMMENDATION_TEXTS[recommendation]}
        </p>
      </div>

      {step.cliffhanger && (
        <p className="text-sm opacity-60 italic">{step.cliffhanger}</p>
      )}

      <p className="text-xs opacity-50">
        Wir senden dir gleich die vollstaendige Auswertung per Mail.
      </p>

      {submitError && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-red-500">
            Lead-Speicherung fehlgeschlagen -- wir versuchen es nochmal
          </p>
          <button
            onClick={onRetry}
            className="text-xs underline opacity-70 self-start"
          >
            Retry
          </button>
        </div>
      )}

      {submitted && !submitError && (
        <p className="text-xs opacity-40">Anfrage gespeichert.</p>
      )}

      <a
        href={ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 w-full py-3 px-6 rounded-xl font-semibold text-white text-base text-center block transition-opacity"
        style={{ backgroundColor: theme.accentColor }}
      >
        Termin buchen
      </a>
    </div>
  );
}

function CtaBookingStep({
  step,
  theme,
}: {
  step: Extract<FunnelStep, { type: 'cta-booking' }>;
  theme: FunnelTheme;
}) {
  return (
    <div className="flex flex-col gap-4">
      {step.title && <h2 className="text-2xl font-semibold">{step.title}</h2>}
      {step.body && <p className="text-base opacity-80">{step.body}</p>}
      <PrimaryButton
        label={step.ctaLabel ?? 'Termin buchen'}
        href={step.calendarUrl}
        theme={theme}
      />
      {step.noteUnderButton && (
        <p className="text-xs opacity-50 text-center">{step.noteUnderButton}</p>
      )}
    </div>
  );
}

// ---- main component ----

export default function FunnelRunner() {
  const { slug } = useParams<{ slug: string }>();

  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [lead, setLead] = useState<LeadState>({});
  const [answers, setAnswers] = useState<AnswersState>({});
  const [calcVars, setCalcVars] = useState<CalcVarsState>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitAttempted = useRef(false);
  const utm = useRef<Record<string, string>>(readUtm());

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    getFunnelBySlug(slug)
      .then((f) => {
        if (f.status === 'archived') { setNotFound(true); }
        else { setFunnel(f); }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const steps = funnel?.config.steps ?? [];
  const theme: FunnelTheme = funnel?.config.theme ?? DEFAULT_FUNNEL_THEME;

  const scores = funnel ? computeScores(steps, answers) : ({} as DimScores);
  const recommendation = computeRecommendation(scores);

  function buildSubmitPayload(): LeadSubmission {
    const numericScores: Record<string, number> = {};
    for (const d of SPIDER_DIMENSIONS) {
      numericScores[d.key] = scores[d.key] ?? 0;
    }
    return {
      ...(lead as Partial<Record<LeadField, string>>),
      answers,
      scores: numericScores,
      recommendation,
      utm: utm.current,
    };
  }

  function doSubmit() {
    if (!slug) return;
    submitFunnelLead(slug, buildSubmitPayload())
      .then(() => { setSubmitted(true); setSubmitError(null); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setSubmitError(msg);
      });
  }

  function handleResultMount() {
    if (submitAttempted.current) return;
    submitAttempted.current = true;
    doSubmit();
  }

  function advance() {
    setCurrentStepIndex((i) => i + 1);
  }

  function goBack() {
    setCurrentStepIndex((i) => Math.max(0, i - 1));
  }

  // ---- loading / error states ----

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: DEFAULT_FUNNEL_THEME.backgroundColor }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: DEFAULT_FUNNEL_THEME.accentColor }}
        />
      </div>
    );
  }

  if (notFound || !funnel) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: DEFAULT_FUNNEL_THEME.backgroundColor }}
      >
        <div
          className="max-w-sm w-full rounded-2xl border p-8 text-center"
          style={{
            backgroundColor: DEFAULT_FUNNEL_THEME.cardColor,
            borderColor: DEFAULT_FUNNEL_THEME.borderColor,
            color: DEFAULT_FUNNEL_THEME.textColor,
          }}
        >
          <p className="text-lg font-semibold">Funnel nicht gefunden</p>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <Card theme={theme}>
          <p className="text-base opacity-70">
            Dieser Funnel hat noch keine Schritte.
          </p>
        </Card>
      </div>
    );
  }

  const step = steps[currentStepIndex];
  const isLast = currentStepIndex >= steps.length - 1;
  const showProgress = funnel.config.settings.progressBar;
  const progressPct = ((currentStepIndex + 1) / steps.length) * 100;

  const ctaUrl =
    funnel.config.settings.ctaCalendarUrl;

  function renderStep(s: FunnelStep) {
    switch (s.type) {
      case 'intro':
        return (
          <IntroStep step={s} theme={theme} onNext={advance} />
        );
      case 'lead-capture':
        return (
          <LeadCaptureStep
            step={s}
            lead={lead}
            onChange={(key, val) =>
              setLead((prev) => ({ ...prev, [key]: val }))
            }
            onNext={advance}
            theme={theme}
          />
        );
      case 'question':
        return (
          <QuestionStep
            step={s}
            selected={answers[s.id] ?? []}
            onChange={(ids) =>
              setAnswers((prev) => ({ ...prev, [s.id]: ids }))
            }
            onNext={advance}
            theme={theme}
          />
        );
      case 'calc-input':
        return (
          <CalcInputStep
            step={s}
            value={calcVars[s.variableName] ?? s.defaultValue}
            onChange={(v) =>
              setCalcVars((prev) => ({ ...prev, [s.variableName]: v }))
            }
            onNext={advance}
            theme={theme}
          />
        );
      case 'result-spider':
        return (
          <ResultSpiderStepWrapper
            step={s}
            scores={scores}
            recommendation={recommendation}
            submitted={submitted}
            submitError={submitError}
            onRetry={doSubmit}
            theme={theme}
            ctaUrl={ctaUrl}
            onMount={handleResultMount}
          />
        );
      case 'cta-booking':
        return <CtaBookingStep step={s} theme={theme} />;
    }
  }

  return (
    <div
      className="min-h-screen p-4 sm:p-8 flex flex-col"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {showProgress && (
        <div className="w-full max-w-xl mx-auto mb-6">
          <div className="flex justify-between items-center mb-1">
            <span
              className="text-xs font-medium"
              style={{ color: theme.textColor, opacity: 0.6 }}
            >
              Schritt {currentStepIndex + 1} von {steps.length}
            </span>
          </div>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: theme.borderColor }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                backgroundColor: theme.accentColor,
              }}
            />
          </div>
        </div>
      )}

      {currentStepIndex > 0 && (
        <div className="w-full max-w-xl mx-auto mb-2">
          <button
            onClick={goBack}
            className="text-sm opacity-50 hover:opacity-80 transition-opacity"
            style={{ color: theme.textColor }}
          >
            &larr; Zurueck
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center">
        <Card theme={theme}>{renderStep(step)}</Card>
        {isLast && step.type !== 'result-spider' && step.type !== 'cta-booking' && (
          <div className="w-full max-w-xl mx-auto mt-4">
          </div>
        )}
      </div>
    </div>
  );
}

// ---- wrapper to fire onMount for result-spider ----

function ResultSpiderStepWrapper({
  step,
  scores,
  recommendation,
  submitted,
  submitError,
  onRetry,
  theme,
  ctaUrl,
  onMount,
}: {
  step: Extract<FunnelStep, { type: 'result-spider' }>;
  scores: DimScores;
  recommendation: RecommendationKey;
  submitted: boolean;
  submitError: string | null;
  onRetry: () => void;
  theme: FunnelTheme;
  ctaUrl: string;
  onMount: () => void;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    onMount();
  }, [onMount]);

  return (
    <ResultSpiderStep
      step={step}
      scores={scores}
      recommendation={recommendation}
      submitted={submitted}
      submitError={submitError}
      onRetry={onRetry}
      theme={theme}
      ctaUrl={ctaUrl}
    />
  );
}
