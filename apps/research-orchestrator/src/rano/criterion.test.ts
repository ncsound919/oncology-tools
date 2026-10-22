import { describe, it, expect } from 'vitest';
import { evaluateCriterion, parseCriterion, resolveMetric } from './criterion.js';
import type { ResponseCohortSummary } from './score.js';

const summary: ResponseCohortSummary = {
  n: 4,
  counts: { CR: 0, PR: 1, SD: 0, PD: 1, unconfirmed: 1, indeterminate: 1 },
  indeterminateRate: 0.25,
  pspProxyRate: 0.25,
  confirmedPDRate: 0.25,
};

describe('preregistered criterion', () => {
  it('parses "<metric> <op> <number>" and rejects free text', () => {
    expect(parseCriterion('pspProxyRate >= 0.10')).toEqual({ metric: 'pspProxyRate', op: '>=', threshold: 0.1 });
    expect(parseCriterion('flip rate > 0.1')).toBeNull();
    expect(parseCriterion(null)).toBeNull();
  });

  it('resolves known metrics and rejects unknown ones', () => {
    expect(resolveMetric(summary, 'pspProxyRate')).toBe(0.25);
    expect(resolveMetric(summary, 'counts.PD')).toBe(1);
    expect(resolveMetric(summary, 'n')).toBe(4);
    expect(resolveMetric(summary, 'mystery')).toBeNull();
  });

  it('returns supported when the success criterion is met', () => {
    expect(evaluateCriterion(summary, 'pspProxyRate >= 0.10', 'pspProxyRate < 0.10').verdict).toBe('supported');
  });

  it('returns falsified when only the falsifier is met', () => {
    expect(evaluateCriterion(summary, 'pspProxyRate >= 0.50', 'pspProxyRate < 0.50').verdict).toBe('falsified');
  });

  it('returns null when neither is met', () => {
    expect(evaluateCriterion(summary, 'pspProxyRate >= 0.50', 'pspProxyRate <= 0.10').verdict).toBe('null');
  });

  it('is inconclusive for an unparseable criterion or an unknown metric (never invented)', () => {
    expect(evaluateCriterion(summary, 'flip rate > 0.1').verdict).toBe('inconclusive');
    expect(evaluateCriterion(summary, 'mysteryMetric >= 0.1').verdict).toBe('inconclusive');
    expect(evaluateCriterion(summary, null).verdict).toBe('inconclusive');
  });
});
