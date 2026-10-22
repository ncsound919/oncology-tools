import { describe, it, expect } from 'vitest';
import { parseRecourseEnvelope, fetchComputeResult, RECOURSE_RESULT_MARKER } from './recourse.js';

// ── Recourse result retrieval ────────────────────────────────────────────────
// The kernel prints a `__RECOURSE_RESULT__ <json>` envelope; the result route
// awaits the job and returns its stdout. These tests pin the parsing and the
// fail-soft behaviour (never invent a value; report the real error).

describe('parseRecourseEnvelope', () => {
  it('parses the last envelope line', () => {
    const stdout = `noise\n${RECOURSE_RESULT_MARKER} {"ok":true,"meanFinal":12.5}\n`;
    expect(parseRecourseEnvelope(stdout)).toEqual({ ok: true, meanFinal: 12.5 });
  });

  it('skips a malformed line and uses the previous valid one', () => {
    const stdout = `${RECOURSE_RESULT_MARKER} {"ok":true}\n${RECOURSE_RESULT_MARKER} not-json\n`;
    expect(parseRecourseEnvelope(stdout)).toEqual({ ok: true });
  });

  it('returns undefined when no envelope is present', () => {
    expect(parseRecourseEnvelope('just logs')).toBeUndefined();
    expect(parseRecourseEnvelope(undefined)).toBeUndefined();
  });
});

describe('fetchComputeResult', () => {
  it('awaits the job and returns the parsed envelope', async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          success: true,
          result: { success: true, stdout: [`${RECOURSE_RESULT_MARKER} {"ok":true,"nSeeds":5,"meanFinal":9.9}`] },
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const r = await fetchComputeResult('djoochie/x', { fetchImpl, awaitTimeoutMs: 1000 });
    expect(r.available).toBe(true);
    expect(r.success).toBe(true);
    expect(r.envelope).toMatchObject({ nSeeds: 5, meanFinal: 9.9 });
  });

  it('reports unavailable on a non-ok response', async () => {
    const fetchImpl = (async () => new Response('nope', { status: 500 })) as unknown as typeof fetch;
    const r = await fetchComputeResult('x', { fetchImpl });
    expect(r.available).toBe(false);
    expect(r.error).toMatch(/HTTP 500/);
  });

  it('reports unavailable when the fetch throws', async () => {
    const fetchImpl = (async () => {
      throw new Error('recourse down');
    }) as unknown as typeof fetch;
    const r = await fetchComputeResult('x', { fetchImpl });
    expect(r.available).toBe(false);
    expect(r.error).toMatch(/recourse down/);
  });
});
