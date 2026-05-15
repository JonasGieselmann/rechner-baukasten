import { describe, it, expect } from 'vitest';
import {
  computeScores,
  fundamentScore,
  computeRecommendation,
} from '../score';
import type { FunnelStep, QuestionStep, SpiderDimension } from '../../types';

function q(id: string, dimension: SpiderDimension, options: Array<[string, number]>): QuestionStep {
  return {
    id,
    type: 'question',
    question: `Q ${id}`,
    dimension,
    options: options.map(([oid, score]) => ({ id: oid, label: oid, score })),
    allowMultiple: false,
    required: true,
  };
}

describe('computeScores', () => {
  it('returns 0 for every dimension when there are no questions', () => {
    const result = computeScores([], {});
    expect(result['social-media']).toBe(0);
    expect(result['mitarbeiter']).toBe(0);
  });

  it('picks the selected option score for a single-select question', () => {
    const steps: FunnelStep[] = [
      q('q1', 'website', [['a', 30], ['b', 75]]),
    ];
    const scores = computeScores(steps, { q1: ['b'] });
    expect(scores['website']).toBe(75);
  });

  it('averages the option scores across multiple questions on the same dimension', () => {
    const steps: FunnelStep[] = [
      q('q1', 'trust', [['a', 100]]),
      q('q2', 'trust', [['a', 50]]),
    ];
    const scores = computeScores(steps, { q1: ['a'], q2: ['a'] });
    expect(scores['trust']).toBe(75);
  });

  it('returns 0 for dimensions where the user did not answer', () => {
    const steps: FunnelStep[] = [q('q1', 'website', [['a', 80]])];
    const scores = computeScores(steps, { q1: ['a'] });
    expect(scores['trust']).toBe(0);
    expect(scores['mitarbeiter']).toBe(0);
  });

  it('ignores question steps with no selected options', () => {
    const steps: FunnelStep[] = [q('q1', 'branding', [['a', 90]])];
    const scores = computeScores(steps, { q1: [] });
    expect(scores['branding']).toBe(0);
  });
});

describe('fundamentScore', () => {
  it('averages the five fundament dimensions', () => {
    const value = fundamentScore({
      'social-media': 50,
      website: 50,
      branding: 50,
      trust: 50,
      auffindbarkeit: 50,
      umsatzpotenzial: 0,
      mitarbeiter: 0,
      regional: 0,
    });
    expect(value).toBe(50);
  });

  it('treats missing dimensions as 0', () => {
    expect(fundamentScore({ website: 100 })).toBe(20);
  });
});

describe('computeRecommendation', () => {
  it('returns fundament-aufbauen below 40', () => {
    expect(
      computeRecommendation({ 'social-media': 20, website: 30, branding: 10, trust: 10, auffindbarkeit: 20 }),
    ).toBe('fundament-aufbauen');
  });

  it('returns stufe-1 between 40 and 60', () => {
    expect(
      computeRecommendation({ 'social-media': 50, website: 50, branding: 50, trust: 50, auffindbarkeit: 50 }),
    ).toBe('stufe-1');
  });

  it('returns stufe-2 between 60 and 80', () => {
    expect(
      computeRecommendation({ 'social-media': 70, website: 70, branding: 70, trust: 70, auffindbarkeit: 70 }),
    ).toBe('stufe-2');
  });

  it('returns stufe-3 at 80 or above', () => {
    expect(
      computeRecommendation({ 'social-media': 90, website: 90, branding: 90, trust: 90, auffindbarkeit: 90 }),
    ).toBe('stufe-3');
  });

  it('bumps up one stage when umsatz > 70 AND mitarbeiter >= 80', () => {
    expect(
      computeRecommendation({
        'social-media': 50, website: 50, branding: 50, trust: 50, auffindbarkeit: 50,
        umsatzpotenzial: 75, mitarbeiter: 80,
      }),
    ).toBe('stufe-2');
  });

  it('does not bump when only umsatz is high', () => {
    expect(
      computeRecommendation({
        'social-media': 50, website: 50, branding: 50, trust: 50, auffindbarkeit: 50,
        umsatzpotenzial: 90, mitarbeiter: 40,
      }),
    ).toBe('stufe-1');
  });

  it('does not bump beyond stufe-3', () => {
    expect(
      computeRecommendation({
        'social-media': 95, website: 95, branding: 95, trust: 95, auffindbarkeit: 95,
        umsatzpotenzial: 100, mitarbeiter: 100,
      }),
    ).toBe('stufe-3');
  });
});
