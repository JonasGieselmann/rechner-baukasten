import type { FunnelStep, SpiderDimension } from '../types';
import { SPIDER_DIMENSIONS } from '../types';

export type DimScores = Partial<Record<SpiderDimension, number>>;
export type AnswersState = Record<string, string[]>;

export type RecommendationKey =
  | 'fundament-aufbauen'
  | 'stufe-1'
  | 'stufe-2'
  | 'stufe-3';

export const RECOMMENDATION_TEXTS: Record<RecommendationKey, string> = {
  'fundament-aufbauen':
    'Marketing ohne Fundament verbrennt Geld. Erst Social Media, Website und Branding sauber aufbauen, dann skalieren.',
  'stufe-1':
    'Dein Fundament steht. Du bekommst qualifizierte Leads und schließt selbst ab, maximale Transparenz.',
  'stufe-2':
    'Du bist bereit für automatische Buchungen. Wir leiten Interessenten direkt in deinen Kalender.',
  'stufe-3':
    'Du spielst in der Skalierungsliga. Wir übernehmen alles, du behandelst.',
};

// Human-readable stage titles. The internal RecommendationKey (e.g. 'stufe-1')
// must never reach the UI directly; always resolve it through this map.
export const RECOMMENDATION_LABELS: Record<RecommendationKey, string> = {
  'fundament-aufbauen': 'Fundament aufbauen',
  'stufe-1': 'Stufe 1: Fundament steht',
  'stufe-2': 'Stufe 2: Bereit für Automatisierung',
  'stufe-3': 'Stufe 3: Skalierung',
};

// Resolve a stored recommendation value (key OR already-friendly text) to a
// readable label. Returns the input unchanged if it isn't a known key, so
// historical/free-text values never render as a raw enum slug.
export function recommendationLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return RECOMMENDATION_LABELS[value as RecommendationKey] ?? value;
}

const FUNDAMENT_DIMENSIONS: SpiderDimension[] = [
  'social-media',
  'website',
  'branding',
  'trust',
  'auffindbarkeit',
];

export function computeScores(steps: FunnelStep[], answers: AnswersState): DimScores {
  const buckets: Partial<Record<SpiderDimension, number[]>> = {};

  for (const step of steps) {
    if (step.type !== 'question') continue;
    const selected = answers[step.id] ?? [];
    if (selected.length === 0) continue;
    const scores = step.options.filter((o) => selected.includes(o.id)).map((o) => o.score);
    if (scores.length === 0) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (!buckets[step.dimension]) buckets[step.dimension] = [];
    buckets[step.dimension]!.push(avg);
  }

  const result: DimScores = {};
  for (const dim of SPIDER_DIMENSIONS) {
    const vals = buckets[dim.key];
    result[dim.key] = vals ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }
  return result;
}

export function fundamentScore(scores: DimScores): number {
  const sum = FUNDAMENT_DIMENSIONS.map((d) => scores[d] ?? 0).reduce((a, b) => a + b, 0);
  return sum / FUNDAMENT_DIMENSIONS.length;
}

export function computeRecommendation(scores: DimScores): RecommendationKey {
  const f = fundamentScore(scores);
  let stage: RecommendationKey;
  if (f < 40) stage = 'fundament-aufbauen';
  else if (f < 60) stage = 'stufe-1';
  else if (f < 80) stage = 'stufe-2';
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
