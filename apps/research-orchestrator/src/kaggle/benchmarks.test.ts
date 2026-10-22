import { describe, it, expect } from 'vitest';
import { slugBenchmarkName, buildCriterionBenchmarkTask, benchmarkLeaderboardUrl, fetchBenchmarkLeaderboard } from './benchmarks.js';

function fakeFetch(res: { ok: boolean; status?: number; body?: unknown }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return { ok: res.ok, status: res.status ?? (res.ok ? 200 : 500), json: async () => res.body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

describe('kaggle benchmarks', () => {
  it('slugifies a task name to a Python identifier', () => {
    expect(slugBenchmarkName('RANO 2.0 flat-call flip rate!')).toMatch(/^rano_2_0_flat_call_flip_rate$/);
    expect(slugBenchmarkName('a')).toBe('task_a');
    expect(slugBenchmarkName('')).toBe('task_x');
  });

  it('builds a valid kbench task with an explicit assertion', () => {
    const t = buildCriterionBenchmarkTask({ name: 'EGFR T790M assay', prompt: 'Does T790M cause resistance?', regex: 'yes', expectation: 'answer cites resistance' });
    expect(t.name).toBe('egfr_t790m_assay');
    expect(t.python).toContain('import kaggle_benchmarks as kbench');
    expect(t.python).toContain('@kbench.task(name="egfr_t790m_assay")');
    expect(t.python).toContain('kbench.assertions.assert_contains_regex');
    expect(t.python).toContain('expected_behavior.run(llm=kbench.llm');
    expect(t.python).toContain('(?i)yes');
  });

  it('builds the leaderboard URL, optional version', () => {
    expect(benchmarkLeaderboardUrl('open-benchmarks', 'scicode')).toBe('https://www.kaggle.com/api/v1/benchmarks/open-benchmarks/scicode/leaderboard');
    expect(benchmarkLeaderboardUrl('a b', 'c/d', { version: 2 })).toBe('https://www.kaggle.com/api/v1/benchmarks/a%20b/c%2Fd/leaderboard?versionNumber=2');
  });

  it('fetches a leaderboard and attaches auth only when a credential exists', async () => {
    const f1 = fakeFetch({ ok: true, body: { rows: [{ team: 'x', score: 1 }] } });
    const r1 = await fetchBenchmarkLeaderboard('open-benchmarks', 'scicode', { fetchImpl: f1.impl, creds: null });
    expect(r1.ok).toBe(true);
    expect(f1.calls[0]!.init?.headers).not.toHaveProperty('Authorization');

    const f2 = fakeFetch({ ok: true, body: [] });
    await fetchBenchmarkLeaderboard('me', 'private-bench', { fetchImpl: f2.impl, creds: { kind: 'basic', username: 'u', key: 'k', source: 'env-username-key' } });
    expect((f2.calls[0]!.init?.headers as Record<string, string>).Authorization).toMatch(/^Basic /);
  });

  it('fails softly on a non-2xx and on a throw', async () => {
    const f = fakeFetch({ ok: false, status: 404 });
    expect((await fetchBenchmarkLeaderboard('x', 'y', { fetchImpl: f.impl })).ok).toBe(false);
    const boom = (async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const r = await fetchBenchmarkLeaderboard('x', 'y', { fetchImpl: boom });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('network down');
  });
});