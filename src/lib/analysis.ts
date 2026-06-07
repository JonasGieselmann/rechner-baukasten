import type { Lead } from '../types';

// Analysis history + month-over-month progress is derived from the user's leads
// (each completed Potenzialanalyse is one lead row with scores + kalkuPotential +
// createdAt). No separate history table needed.

export function overallScore(lead: Lead): number {
  const vals = Object.values(lead.scores ?? {}).filter((v): v is number => typeof v === 'number');
  if (vals.length === 0) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function revenueDelta(lead: Lead): number | null {
  const delta = lead.kalkuPotential?.delta;
  return typeof delta === 'number' ? delta : null;
}

export function monthsSince(dateIso: string): number {
  const then = new Date(dateIso).getTime();
  if (Number.isNaN(then)) return 0;
  return (Date.now() - then) / (1000 * 60 * 60 * 24 * 30);
}

export interface AnalysisProgress {
  latest: Lead | null;
  previous: Lead | null;
  history: Lead[]; // newest first
  latestScore: number;
  scoreDelta: number | null; // latest overall score minus previous
  revenueDelta: number | null; // latest monthly extra revenue potential
  dueForUpdate: boolean; // latest analysis is at least a month old
  count: number;
}

export function computeProgress(leads: Lead[]): AnalysisProgress {
  const history = [...leads].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = history[0] ?? null;
  const previous = history[1] ?? null;
  const latestScore = latest ? overallScore(latest) : 0;
  const scoreDelta = latest && previous ? latestScore - overallScore(previous) : null;
  return {
    latest,
    previous,
    history,
    latestScore,
    scoreDelta,
    revenueDelta: latest ? revenueDelta(latest) : null,
    dueForUpdate: latest ? monthsSince(latest.createdAt) >= 1 : false,
    count: history.length,
  };
}

export function formatAnalysisDate(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
}
