import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluatePromotion, type PromotionInput } from './gate/promotion.js';
import { buildProvenanceSpine, verifySpineChain, manubotCitations, anchorTimestamp, entity, findTsaEngine, defaultTsaRunner } from './provenance/spine.js';
import { buildCadence } from './cadence.js';
import { reverifyGeneratedCode, runOpenHubGate, synthbookGround } from './fleet/externalClients.js';

const good: PromotionInput = {
  hypothesisId: 'hyp_x',
  preregistered: true,
  claimsResolved: { total: 5, unresolved: 0 },
  negativeControlPresent: true,
  evidenceTier: 3,
};

describe('Phase 3 — promotion gate', () => {
  it('promotes when every required check passes and no external check is wired', async () => {
    const v = await evaluatePromotion(good);
    expect(v.decision).toBe('promote');
  });

  it('refuses without preregistration, unresolved refs, no negative control, or tier 0', async () => {
    expect((await evaluatePromotion({ ...good, preregistered: false })).decision).toBe('refuse');
    expect((await evaluatePromotion({ ...good, claimsResolved: { total: 5, unresolved: 1 } })).decision).toBe('refuse');
    expect((await evaluatePromotion({ ...good, negativeControlPresent: false })).decision).toBe('refuse');
    expect((await evaluatePromotion({ ...good, evidenceTier: 0 })).decision).toBe('refuse');
  });

  it('refuses a notebook that fails the submission gate', async () => {
    const v = await evaluatePromotion({ ...good, notebookCells: [{ type: 'code', source: 'print(1)' }] });
    expect(v.decision).toBe('refuse');
    expect(v.reasons.join(' ')).toMatch(/notebook gate failed/);
  });

  it('is conditional (never a fake pass) when an external check is unavailable', async () => {
    const v = await evaluatePromotion({ ...good, generatedCode: 'print(1)' }, {
      reverifyCode: async () => ({ verified: false, available: false, detail: 'down' }),
      openhubAudit: async () => ({ available: false, error: 'down' }),
    });
    expect(v.decision).toBe('conditional');
    expect(v.skipped).toEqual(expect.arrayContaining(['recourse-verify', 'openhub-audit']));
  });

  it('refuses when the Recourse sandbox rejects the generated code, or OpenHub fails', async () => {
    const a = await evaluatePromotion({ ...good, generatedCode: 'print(1)' }, { reverifyCode: async () => ({ verified: false, available: true, detail: 'test failed' }) });
    expect(a.decision).toBe('refuse');
    const b = await evaluatePromotion(good, { openhubAudit: async () => ({ available: true, passed: false, failing: ['TOO_LONG'] }) });
    expect(b.decision).toBe('refuse');
  });
});

describe('Phase 4 — provenance spine', () => {
  it('chains run spines and detects tampering', () => {
    const a = buildProvenanceSpine({ runId: 'r1', entities: [entity('input', 'x', 'hello')] });
    const b = buildProvenanceSpine({ runId: 'r2', entities: [entity('output', 'y', 'world')], prev: a });
    expect(b.prevHash).toBe(a.hash);
    expect(verifySpineChain([a, b]).ok).toBe(true);
    const tampered = { ...b, hash: 'deadbeef' };
    expect(verifySpineChain([a, tampered]).ok).toBe(false);
  });

  it('emits a Manubot cite-by-id block', () => {
    expect(manubotCitations(['10.1/x', 'doi:10.2/y'])).toBe('[@doi:10.1/x]\n[@doi:10.2/y]');
  });

  it('RFC-3161 anchoring refuses a bad digest and a missing engine', () => {
    // Non-hex digest: refused before any engine is touched.
    const bad = anchorTimestamp('abc');
    expect(bad.anchored).toBe(false);
    expect(bad.error).toMatch(/64-char lowercase sha256 hex/);

    // No engine found: refused, and it names the one implementation to wire.
    const noEngine = anchorTimestamp('a'.repeat(64), { engine: null });
    expect(noEngine.anchored).toBe(false);
    expect(noEngine.error).toMatch(/tsa_prove\.py/);
    expect(noEngine.error).toMatch(/do not add another/);
  });

  it('a successful stamp is NOT an anchor until the token verifies', async () => {
    const hex = 'a'.repeat(64);
    const stampOk = JSON.stringify({ ok: true, genTime: '2026-01-01T00:00:00+00:00', token_out: 't.tsr' });

    // stamp ok + verify ok -> anchored and verified
    const both = anchorTimestamp(hex, {
      tokenPath: 't.tsr',
      runner: (args) => ({
        status: 0,
        stdout: args[0] === 'stamp' ? stampOk : JSON.stringify({ ok: true, signature_ok: true, imprint_ok: true, genTime: '2026-01-01T00:00:00+00:00' }),
      }),
    });
    expect(both.anchored).toBe(true);
    expect(both.verified).toBe(true);
    expect(both.genTime).toBe('2026-01-01T00:00:00+00:00');

    // stamp ok, verify REFUSES -> not anchored. This is the whole point: a token
    // that cannot be verified is what the previous implementation accepted.
    const unverified = anchorTimestamp(hex, {
      tokenPath: 't.tsr',
      runner: (args) => ({
        status: args[0] === 'stamp' ? 0 : 1,
        stdout: args[0] === 'stamp' ? stampOk : JSON.stringify({ refuse: true, error: 'message imprint mismatch' }),
      }),
    });
    expect(unverified.anchored).toBe(false);
    expect(unverified.verified).toBeUndefined();
    expect(unverified.error).toMatch(/message imprint mismatch/);

    // A caller cannot swap in a JSON {"token": ...} and get anchored:true.
    const spoof = anchorTimestamp(hex, {
      tokenPath: 't.tsr',
      runner: () => ({ status: 0, stdout: JSON.stringify({ token: 'TSTOKEN' }) }),
    });
    expect(spoof.anchored).toBe(false);
  });
});

// Live end-to-end against the real TSA. Opt-in (TSA_LIVE=1) because it needs
// python + openssl + network, and a CI run must not depend on freetsa.org.
const live = process.env.TSA_LIVE === '1' ? it : it.skip;
describe('Phase 4 — RFC-3161 live anchor', () => {
  live('anchors a real digest and verifies it', () => {
    const hash = createHash('sha256').update('live-anchor-probe').digest('hex');
    const res = anchorTimestamp(hash, { tokenPath: join(tmpdir(), `live-${hash.slice(0, 12)}.tsr`) });
    expect(res.error ?? '').toBe('');
    expect(res.anchored).toBe(true);
    expect(res.verified).toBe(true);
    expect(res.genTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Negative control: the SAME token must REFUSE a DIFFERENT digest.
    // It has to be done at the engine level: anchorTimestamp stamps first, so
    // calling it with another hash would legitimately obtain a fresh token for
    // that hash and verify. Digest-binding is only tested by re-verifying the
    // existing token against a hash it was not issued for.
    const engine = findTsaEngine();
    expect(engine).toBeTruthy();
    const mismatch = defaultTsaRunner(engine as string)([
      'verify', '--hash', 'b'.repeat(64), '--token', res.tokenPath as string,
    ]);
    const verdict = JSON.parse(mismatch.stdout) as { ok?: boolean; error?: string };
    expect(verdict.ok).not.toBe(true);
    expect(mismatch.status).not.toBe(0);
    expect(verdict.error ?? '').toMatch(/imprint|verify|mismatch/i);
  }, 60_000);
});

describe('Phase 4 — cadence', () => {
  it('builds a priority-ordered P0–P7 agenda from hypothesis state', () => {
    const steps = buildCadence({ hypotheses: [{ id: 'h1', status: 'proposed' }, { id: 'h2', status: 'testing' }, { id: 'h3', status: 'preregistered' }] });
    const phases = steps.map((s) => s.phase);
    expect(phases).toContain('P0');
    expect(phases).toContain('P4');
    expect(phases).toContain('P6');
    expect(phases).toContain('P7');
    // high-priority step first
    expect(steps[0].priority).toBe('high');
    expect(steps.find((s) => s.phase === 'P7')?.targets).toContain('h2');
    expect(steps.find((s) => s.phase === 'P6')?.targets).toContain('h3');
  });
});

describe('Phase 3 — ecosystem clients (fail-soft)', () => {
  it('reverifyGeneratedCode reports unavailable (not verified) when Recourse is down', async () => {
    const f = vi.fn(async () => { throw new Error('ECONNREFUSED'); });
    const r = await reverifyGeneratedCode({ code: 'print(1)' }, { baseUrl: 'http://x', fetchImpl: f as unknown as typeof fetch });
    expect(r.available).toBe(false);
    expect(r.verified).toBe(false);
  });

  it('reverifyGeneratedCode reports verified only on an explicit ok', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const r = await reverifyGeneratedCode({ code: 'print(1)' }, { baseUrl: 'http://x', fetchImpl: f as unknown as typeof fetch });
    expect(r.available).toBe(true);
    expect(r.verified).toBe(true);
  });

  it('runOpenHubGate reports unavailable on non-2xx', async () => {
    const f = vi.fn(async () => new Response('nope', { status: 500 }));
    const r = await runOpenHubGate([], { baseUrl: 'http://x', fetchImpl: f as unknown as typeof fetch });
    expect(r.available).toBe(false);
  });

  it('synthbookGround is not-configured without a URL, and parses hits when up', async () => {
    const nc = await synthbookGround('q', { baseUrl: '' });
    expect(nc.available).toBe(false);
    expect(nc.error).toMatch(/not configured/);
    const f = vi.fn(async () => new Response(JSON.stringify({ chunks: [{ source: 'paper-1', text: 'snippet', score: 0.9 }] }), { status: 200 }));
    const up = await synthbookGround('q', { baseUrl: 'http://sb', fetchImpl: f as unknown as typeof fetch });
    expect(up.available).toBe(true);
    expect(up.hits[0]).toEqual({ source: 'paper-1', snippet: 'snippet', score: 0.9 });
  });
});
