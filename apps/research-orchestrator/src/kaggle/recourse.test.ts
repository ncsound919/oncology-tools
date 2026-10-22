import { describe, it, expect } from 'vitest';
import { buildKaggleNotebookJob, submitNotebookJob, fetchComputePlatforms, recourseBaseUrl } from './recourse.js';

function fakeFetch(res: { ok: boolean; status?: number; body?: unknown }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return { ok: res.ok, status: res.status ?? (res.ok ? 200 : 500), json: async () => res.body } as unknown as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const CELLS = [{ type: 'code' as const, source: 'print("__RECOURSE_RESULT__ {}")' }];

describe('recourse compute client', () => {
  it('resolves the base URL from RECOURSE_URL', () => {
    expect(recourseBaseUrl({} as NodeJS.ProcessEnv)).toBe('http://localhost:3050');
    expect(recourseBaseUrl({ RECOURSE_URL: 'http://x:9/' } as NodeJS.ProcessEnv)).toBe('http://x:9');
  });

  it('builds a CPU notebook job and caps the runtime at 12h', () => {
    const job = buildKaggleNotebookJob(CELLS, {});
    expect(job).toMatchObject({ platform: 'kaggle', kind: 'notebook', hardware: { type: 'cpu' }, payload: { kernel: 'python3' } });
    expect(job.id.startsWith('onco_')).toBe(true);
    expect(buildKaggleNotebookJob(CELLS, { maxRuntimeMs: 99 * 3_600_000 }).maxRuntimeMs).toBe(12 * 3_600_000);
  });

  it('carries datasetSources in meta only when supplied', () => {
    expect(buildKaggleNotebookJob(CELLS, {}).meta).toBeUndefined();
    expect(buildKaggleNotebookJob(CELLS, { datasetSources: ['me/panda-subset'] }).meta?.datasetSources).toEqual(['me/panda-subset']);
  });

  it('submits a job and reports availability honestly', async () => {
    const job = buildKaggleNotebookJob(CELLS, { hardware: 'gpu' });
    const f = fakeFetch({ ok: true, body: { handle: { id: job.id } } });
    const r = await submitNotebookJob(job, { fetchImpl: f.impl, baseUrl: 'http://r:1' });
    expect(r.available).toBe(true);
    expect(f.calls[0]!.url).toBe('http://r:1/api/recourse/compute/jobs');
    expect(f.calls[0]!.init?.method).toBe('POST');

    const down = fakeFetch({ ok: false, status: 503 });
    expect((await submitNotebookJob(job, { fetchImpl: down.impl })).available).toBe(false);
    const boom = (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    const r2 = await submitNotebookJob(job, { fetchImpl: boom });
    expect(r2.available).toBe(false);
    expect(r2.error).toContain('ECONNREFUSED');
  });

  it('fetches platform status fail-soft', async () => {
    const f = fakeFetch({ ok: true, body: { platforms: [{ id: 'kaggle', configured: true, available: true }] } });
    const r = await fetchComputePlatforms({ fetchImpl: f.impl });
    expect(r.available).toBe(true);
    expect(r.data?.platforms?.[0]?.id).toBe('kaggle');
    const boom = (async () => { throw new Error('down'); }) as unknown as typeof fetch;
    expect((await fetchComputePlatforms({ fetchImpl: boom })).available).toBe(false);
  });
});