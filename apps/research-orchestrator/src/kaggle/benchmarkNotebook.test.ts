import { describe, it, expect } from 'vitest';
import { buildBenchmarkNotebook, benchmarkTaskCells, benchmarkPushPlan } from './benchmarkNotebook.js';
import { verifyNotebook } from '../verify/notebookGate.js';

const INPUT = { name: 'RANO 2.0 flat-call check', prompt: 'Does the response qualify as a partial response?', regex: 'partial response' };

describe('kaggle benchmark notebook', () => {
  it('builds a nbformat-4 notebook with a markdown + code cell', () => {
    const nb = buildBenchmarkNotebook(INPUT);
    expect(nb.nbformat).toBe(4);
    expect(nb.cells).toHaveLength(2);
    expect(nb.cells[0]!.cell_type).toBe('markdown');
    expect(nb.cells[1]!.cell_type).toBe('code');
    const code = nb.cells[1]!.source.join('');
    expect(code).toContain('import kaggle_benchmarks as kbench');
    expect(code).toContain('@kbench.task(');
    expect(code).toContain('assert_contains_regex');
    expect(nb.metadata.kaggle).toMatchObject({ language: 'python' });
  });

  it('the task cells pass the submission gate without the Recourse envelope', () => {
    const r = verifyNotebook(benchmarkTaskCells(INPUT), { requireEnvelope: false });
    expect(r.ok).toBe(true);
  });

  it('the push plan is explicit that nothing was pushed', () => {
    const plan = benchmarkPushPlan('djoochie', 'rano-referee');
    expect(plan.join('\n')).toContain('djoochie/rano-referee');
    expect(plan.some((s) => /not pushed/i.test(s))).toBe(true);
    expect(plan.some((s) => /identity verification/i.test(s))).toBe(true);
  });
});