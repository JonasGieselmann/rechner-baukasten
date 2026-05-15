import { useState, useEffect, useRef, useCallback } from 'react';
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
} from '../types';
import { SPIDER_DIMENSIONS, DEFAULT_FUNNEL_THEME } from '../types';
import {
  computeScores,
  computeRecommendation,
  RECOMMENDATION_TEXTS,
} from '../engine/score';
import type { DimScores, RecommendationKey } from '../engine/score';
import { renderTitleWithItalics } from '../lib/textFormat';
import { formatCurrency } from '../engine/formula';
import { Spinnennetz } from '../components/Spinnennetz';

type LeadState = Partial<Record<LeadField, string>>;
type AnswersState = Record<string, string[]>;
type CalcVarsState = Record<string, number>;

function readUtm(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const v = params.get(key);
    if (v) utm[key] = v;
  }
  return utm;
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
    'mt-6 w-full py-3 px-6 rounded-xl font-semibold text-base transition-opacity hover:opacity-90 disabled:opacity-40 cursor-pointer';
  const style = {
    backgroundColor: theme.primaryColor,
    color: theme.backgroundColor,
    opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled ? ('none' as const) : ('auto' as const),
  };

  if (href && !disabled) {
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
  // Demo profile values (0..10 scale) for the Spinnennetz hero preview.
  // Wave shape, not a flat circle, hints at the result without revealing it.
  const demoValues = [7.5, 6.5, 5.0, 8.0, 4.5, 7.0, 6.0, 5.5];
  const demoLabels = SPIDER_DIMENSIONS.map((d) => d.label);

  const rendered = renderTitleWithItalics(step.title);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
      <div className="flex flex-col gap-4 order-2 md:order-1">
        {rendered && (
          <h1 className="text-4xl sm:text-5xl font-medium leading-[1.1] tracking-tight">
            {rendered}
          </h1>
        )}
        <p className="text-sm opacity-60 -mt-1">kostenlos in 2 Minuten</p>
        {step.body && <p className="text-base opacity-70 leading-relaxed mt-2">{step.body}</p>}
        <div className="mt-2">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
          >
            {step.ctaLabel ?? 'Jetzt Potenzial erkunden'}
            <span aria-hidden="true">↪</span>
          </button>
        </div>
      </div>

      <div className="order-1 md:order-2 w-full" style={{ height: 380 }} aria-hidden="true">
        <Spinnennetz
          values={demoValues}
          labels={demoLabels}
          accentColor={theme.accentColor}
          gridColor={theme.borderColor}
          labelColor={theme.textColor}
          pointStrokeColor={theme.backgroundColor}
          fillOpacity={0.25}
          radius={180}
          fontSize={11}
        />
      </div>
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
              data-testid={`lead-field-${f.key}`}
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
                color: active ? theme.backgroundColor : theme.textColor,
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
  const isValid = value >= step.min && value <= step.max;

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
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-current"
            style={{ accentColor: theme.accentColor }}
          />
          <span className="text-sm text-center font-semibold">
            {value}
            {step.suffix ? ` ${step.suffix}` : ''}
          </span>
        </div>
      ) : (
        <input
          type="number"
          min={step.min}
          max={step.max}
          value={value}
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
  calcVars,
  onNext,
  hasNextStep,
}: {
  step: Extract<FunnelStep, { type: 'result-spider' }>;
  scores: DimScores;
  recommendation: RecommendationKey;
  submitted: boolean;
  submitError: string | null;
  onRetry: () => void;
  theme: FunnelTheme;
  ctaUrl: string;
  calcVars: CalcVarsState;
  onNext: () => void;
  hasNextStep: boolean;
}) {
  const chartData = SPIDER_DIMENSIONS.map((d) => ({
    subject: d.label,
    score: scores[d.key] ?? 0,
  }));

  const kalku = step.showKalkuChart ? computeKalkuPotential(calcVars) : null;

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

      {kalku && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: theme.borderColor, backgroundColor: theme.backgroundColor }}
        >
          <p className="text-sm font-medium opacity-60 mb-2">Ihr Umsatz-Potenzial</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-xs opacity-60">Aktuell / Monat</p>
              <p className="text-lg font-semibold">{formatCurrency(kalku.aktuell)}</p>
            </div>
            <div>
              <p className="text-xs opacity-60">Mit Kapazität</p>
              <p className="text-lg font-semibold">{formatCurrency(kalku.potential)}</p>
            </div>
          </div>
          {kalku.delta > 0 && (
            <p className="text-sm font-semibold" style={{ color: theme.accentColor }}>
              +{formatCurrency(kalku.delta)} Mehrumsatz pro Monat möglich
            </p>
          )}
        </div>
      )}

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
        Wir senden Ihnen gleich die vollständige Auswertung per E-Mail.
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

      {hasNextStep ? (
        <PrimaryButton label="Weiter" onClick={onNext} theme={theme} />
      ) : ctaUrl ? (
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 w-full py-3 px-6 rounded-xl font-semibold text-base text-center block transition-opacity hover:opacity-90"
          style={{ backgroundColor: theme.primaryColor, color: theme.backgroundColor }}
        >
          Termin buchen
        </a>
      ) : null}
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
  const hasUrl = Boolean(step.calendarUrl && step.calendarUrl.trim());
  return (
    <div className="flex flex-col gap-4">
      {step.title && <h2 className="text-2xl font-semibold">{step.title}</h2>}
      {step.body && <p className="text-base opacity-80">{step.body}</p>}
      <PrimaryButton
        label={step.ctaLabel ?? 'Termin buchen'}
        href={hasUrl ? step.calendarUrl : undefined}
        disabled={!hasUrl}
        theme={theme}
      />
      {!hasUrl && (
        <p className="text-xs opacity-60 text-center">
          Termin-Buchung wird noch freigeschaltet. Wir melden uns per E-Mail bei Ihnen.
        </p>
      )}
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
        if (f.status === 'archived') { setNotFound(true); return; }
        setFunnel(f);
        const defaults: CalcVarsState = {};
        for (const s of f.config.steps) {
          if (s.type === 'calc-input') defaults[s.variableName] = s.defaultValue;
        }
        setCalcVars(defaults);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const steps = funnel?.config.steps ?? [];
  const theme: FunnelTheme = funnel?.config.theme ?? DEFAULT_FUNNEL_THEME;

  const scores = funnel ? computeScores(steps, answers) : ({} as DimScores);
  const recommendation = computeRecommendation(scores);

  const doSubmit = useCallback(() => {
    if (!slug) return;
    const numericScores: Record<string, number> = {};
    for (const d of SPIDER_DIMENSIONS) {
      numericScores[d.key] = scores[d.key] ?? 0;
    }
    const hasKalku = Object.keys(calcVars).length > 0;
    const payload: LeadSubmission = {
      ...(lead as Partial<Record<LeadField, string>>),
      answers,
      scores: numericScores,
      recommendation,
      kalkuPotential: hasKalku ? computeKalkuPotential(calcVars) : undefined,
      source: 'funnel',
      utm: utm.current,
    };
    submitFunnelLead(slug, payload)
      .then(() => { setSubmitted(true); setSubmitError(null); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
        setSubmitError(msg);
      });
  }, [slug, lead, answers, scores, recommendation, calcVars]);

  const handleResultMount = useCallback(() => {
    if (submitAttempted.current) return;
    submitAttempted.current = true;
    doSubmit();
  }, [doSubmit]);

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
            calcVars={calcVars}
            onNext={advance}
            hasNextStep={currentStepIndex < steps.length - 1}
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
            &larr; Zurück
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center">
        {step.type === 'intro' ? (
          <div className="w-full max-w-4xl mx-auto px-2 sm:px-6" style={{ color: theme.textColor }}>
            {renderStep(step)}
          </div>
        ) : (
          <Card theme={theme}>{renderStep(step)}</Card>
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
  calcVars,
  onNext,
  hasNextStep,
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
  calcVars: CalcVarsState;
  onNext: () => void;
  hasNextStep: boolean;
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
      calcVars={calcVars}
      onNext={onNext}
      hasNextStep={hasNextStep}
    />
  );
}

function computeKalkuPotential(vars: CalcVarsState): { aktuell: number; potential: number; delta: number } {
  const terminePerWeek = vars['terminePerWeek'] ?? 0;
  const umsatzProTermin = vars['umsatzProTermin'] ?? 0;
  const kapazitaetPerWeek = vars['kapazitaetPerWeek'] ?? terminePerWeek;
  const weeksPerMonth = 4;
  const aktuell = terminePerWeek * umsatzProTermin * weeksPerMonth;
  const potential = Math.max(kapazitaetPerWeek, terminePerWeek) * umsatzProTermin * weeksPerMonth;
  return { aktuell, potential, delta: potential - aktuell };
}

