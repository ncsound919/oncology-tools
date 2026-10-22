import fs from 'node:fs';
import path from 'node:path';
import type { Claim, Contribution, DispatchResult, EvidenceClass, EvidenceRef, ResearchDirective, StudyStage } from './types.js';
import { getStageBSpec } from './stageb.js';
import { validityClass } from './validity.js';

// ── Claims (Phase 2) ─────────────────────────────────────────────────────────
// TWO extraction paths:
//   1. PER-SYSTEM (this file, extractSystemClaims): deterministic extractors run
//      against each Stage B system's structured JSON payload. Real fields only —
//      the extractor never invents numbers. Narrated systems (e.g. oncograph's
//      Gemini report) get a provenance meta-claim instead of a fake finding.
//   2. GLOBAL (extractAndVerifyClaims): LLM extraction over the full evidence
//      inventory, then a DETERMINISTIC verifier that resolves every evidence ref.
// Code, not the model, decides what counts as grounded. Claims.jsonl is
// append-only; claims are stable-ID so later runs can cite them (prior-claim spine).

const LEDGER_DIR = path.join(process.cwd(), 'data', 'ledger');
const CLAIMS_FILE = path.join(LEDGER_DIR, 'claims.jsonl');

const PHOENIX_KEY = process.env.PHOENIX_API_KEY ?? '';
const PHOENIX_URL = (process.env.PHOENIX_BASE_URL ?? 'https://api.pgsgrove.com/v1').replace(/\/$/, '');
const CLAIMS_MODEL = process.env.PHOENIX_SYNTH_MODEL ?? 'glm-5.3-flash';

// ── Store ────────────────────────────────────────────────────────────────────

export function loadClaims(filter?: { runId?: string; kind?: string; verified?: boolean }): Claim[] {
  if (!fs.existsSync(CLAIMS_FILE)) return [];
  const out: Claim[] = [];
  for (const line of fs.readFileSync(CLAIMS_FILE, 'utf-8').split('\n').filter(Boolean)) {
    try {
      const c = JSON.parse(line) as Claim;
      if (filter?.runId && c.runId !== filter.runId) continue;
      if (filter?.kind && c.kind !== filter.kind) continue;
      if (typeof filter?.verified === 'boolean' && c.verified !== filter.verified) continue;
      out.push(c);
    } catch { /* corrupt line skipped, never fatal */ }
  }
  return out;
}

export function getClaim(claimId: string): Claim | null {
  return loadClaims().find(c => c.claimId === claimId) ?? null;
}

export function appendClaims(claims: Claim[]): void {
  fs.mkdirSync(LEDGER_DIR, { recursive: true });
  fs.appendFileSync(CLAIMS_FILE, claims.map(c => JSON.stringify(c)).join('\n') + (claims.length ? '\n' : ''));
}

// ── Resolution sets (deterministic) ─────────────────────────────────────────

function resolvableRefs(contributions: Contribution[], runId: string): Set<string> {
  const s = new Set<string>();
  for (const c of contributions) {
    // system-output refs resolve to any dispatched system with a contribution
    s.add(`system-output:${c.systemId}`);
    for (const p of c.papers ?? []) if (p.id) s.add(`paper:${p.id}`);
  }
  for (const prior of loadClaims()) s.add(`claim:${prior.claimId}`);
  void runId;
  return s;
}

// Models sometimes echo the "type:" prefix inside the id field ("id": "paper:42147338").
// Normalize deterministically: strip any leading "<type>:" so both forms resolve.
function normalizeRef(ref: EvidenceRef): { type: EvidenceRef['type']; id: string } {
  const stripped = ref.id.includes(':') ? ref.id.replace(/^[^:]+:/, '') : ref.id;
  const type = (['paper', 'system-output', 'prior-claim'] as const).includes(ref.type as any) ? ref.type : ref.type;
  const id = stripped || ref.id;
  return { type, id };
}

function refKey(ref: EvidenceRef): string {
  const n = normalizeRef(ref);
  return `${n.type}:${n.id}`;
}

// ── Per-system deterministic extraction (Stage B) ───────────────────────────

export type ClaimCandidate = Omit<Claim, 'claimId' | 'verified' | 'unresolvableRefs' | 'createdAt' | 'runId' | 'confidence'> & { confidence?: number };
export type ClaimCandidateInput = Omit<Claim, 'claimId' | 'verified' | 'unresolvableRefs' | 'createdAt' | 'runId' | 'evidenceClass' | 'confidence'> & { evidenceClass?: EvidenceClass; confidence?: number };

const num = (v: any): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
const pct = (v: any, digits = 1): string | null => {
  const n = num(v);
  return n === null ? null : `${(n * 100).toFixed(digits)}%`;
};
function numericFields(body: any, max = 6): string[] {
  const out: string[] = [];
  const walk = (obj: any, prefix: string, depth: number) => {
    if (out.length >= max || !obj || typeof obj !== 'object' || depth > 1) return;
    for (const [k, v] of Object.entries(obj)) {
      if (out.length >= max) return;
      if (typeof v === 'number' && isFinite(v)) out.push(`${prefix}${k}=${v}`);
      else if (v && typeof v === 'object' && depth < 1) walk(v, `${k}.`, depth + 1);
    }
  };
  walk(body, '', 0);
  return out;
}

function sysRef(systemId: string): EvidenceRef {
  return { type: 'system-output', id: systemId };
}

function candidate(
  text: string,
  kind: Claim['kind'],
  refs: EvidenceRef[],
  evidenceClass: EvidenceClass,
  stage: StudyStage,
  systemId: Claim['systemId'],
  // THEATER REMOVAL: the old default was a hardcoded 0.95 self-report that
  // every claim carried. Confidence is now computed by verifyClaims() from the
  // evidence actually supporting the claim, so candidates carry no confidence.
  confidence?: number,
): ClaimCandidate {
  return { text, kind, evidenceRefs: refs, evidenceDepth: 'derived', evidenceClass, stage, systemId, ...(confidence !== undefined ? { confidence } : {}) };
}

// Deterministic per-system extractors — structured JSON in, factual claims out.
export function extractSystemClaims(r: DispatchResult, inputs?: Record<string, unknown>): ClaimCandidate[] {
  if (!r.ok || (r.stage !== 'simulation' && r.stage !== 'synthesis')) return [];
  const body: any = r.body;
  if (!body || typeof body !== 'object') return [];

  switch (r.systemId) {
    case 'umoe': {
      const nPred = Array.isArray(body.predictions) ? body.predictions.length : null;
      if (!nPred) return [];
      return [candidate(
        `UMOE mechanistic engine run ${body.run_id ?? '(unnumbered)'} completed ok=${body.ok === true} with ${nPred} predictions${Array.isArray(body.timeline) ? ` and a ${body.timeline.length}-point timeline` : ''} (ume.standard_therapy_pipeline, ODE engine registry).`,
        'finding', [sysRef('umoe')], 'computed', 'simulation', 'umoe',
      )];
    }
    case 'chemlab': {
      const fields = numericFields(body);
      if (!fields.length) return [];
      return [candidate(
        `Chemlab kinetics ODE run completed — numeric output fields: ${fields.join(', ')}. (Reaction kinetics for the supplied temperature/time/equivalents/catalyst inputs.)`,
        'finding', [sysRef('chemlab')], 'computed', 'simulation', 'chemlab',
      )];
    }
    case 'attec': {
      const screened = num(body.hitsScreened);
      const nHits = Array.isArray(body.hits) ? body.hits.length : null;
      if (screened === null && nHits === null) return [];
      const target = typeof body.targetProtein === 'string' ? body.targetProtein : 'unknown target';
      return [candidate(
        `ATTEC in-silico virtual screening against ${target}: ${screened ?? '?'} compounds screened, ${nHits ?? '?'} hits. NOTE: the payload's enrichmentFactor field is a hardcoded constant upstream and is excluded from this claim.`,
        'finding', [sysRef('attec')], 'computed', 'simulation', 'attec',
      )];
    }
    case 'oncograph': {
      const report = typeof body.simulationReport === 'string' ? body.simulationReport : null;
      if (!report) return [];
      // NARRATED, not computed: the endpoint is a Gemini prompt. The only
      // honest deterministic claim is a provenance meta-claim — the global LLM
      // pass may extract specifics from the narrative, but they stay tagged narrated.
      return [candidate(
        `Oncograph returned an LLM-GENERATED narrative "knockout simulation" report (~${report.length} chars, Gemini). This is model opinion about clonal dynamics/resistance escape, NOT a mechanistic simulation result — treat as hypothesis material only.`,
        'method-note', [sysRef('oncograph')], 'narrated', 'simulation', 'oncograph', 1,
      )];
    }
    // ── Stage C synthesis extractors ─────────────────────────────────────────
    case 'overlay-oncology': {
      // Overlay Oncology runs in BOTH Stage B (simulate) and Stage C (mechanism-fusion).
      if (r.stage === 'synthesis') {
        // mechanism-fusion GET payload: alignments[], fusions[], status
        const fusions = Array.isArray(body.fusions) ? body.fusions : [];
        const alignments = Array.isArray(body.alignments) ? body.alignments : [];
        if (fusions.length) {
          const nContra = fusions.reduce((n: number, f: any) => n + (Array.isArray(f.contradictions) ? f.contradictions.length : 0), 0);
          return [candidate(
            `Mechanism Fusion Engine (${body.engine ?? 'discover()'}) fused ${fusions.length} mechanism pair(s) (${alignments.length} alignments), surfacing ${nContra} contradiction(s) with transfer/gap hypotheses.`,
            'finding', [sysRef('overlay-oncology')], 'computed', 'synthesis', 'overlay-oncology',
          )];
        }
        const fields = numericFields(body);
        const status = typeof body.status === 'string' ? body.status : (body.success === true ? 'ok' : undefined);
        if (!fields.length && !status) return [];
        return [candidate(
          `Mechanism Fusion Engine synthesis ${status ? `(status: ${status})` : ''}: ${fields.join(', ') || 'no numeric fields in payload'}.`,
          'finding', [sysRef('overlay-oncology')], 'computed', 'synthesis', 'overlay-oncology',
        )];
      }
      // Stage B simulate path
      if (body.success !== true || !Array.isArray(body.history) || body.history.length < 2) return [];
      const first = body.history[0];
      const last = body.history[body.history.length - 1];
      const liveDrop = num(first.liveCells) !== null && num(last.liveCells) !== null
        ? ((first.liveCells - last.liveCells) / Math.max(1, first.liveCells) * 100).toFixed(1)
        : null;
      const parts: string[] = [
        `ic50 ${num(body.ic50) ?? '?'} µM, seed ${num(body.seed) ?? '?'}`,
        `${body.history.length} history points over ${num(last.timeHour) ?? '?'} simulated hours`,
      ];
      if (liveDrop !== null) parts.push(`live-cell reduction ${liveDrop}% (from ${first.liveCells} to ${last.liveCells})`);
      const consErr = num(body.massBalance?.conservationErrorPct);
      if (consErr !== null) parts.push(`mass-balance conservation error ${consErr}%`);
      return [candidate(
        `Overlay Oncology multiscale TME simulation (PK/PD ODE + reaction-diffusion PDE + agent-based contact mechanics): ${parts.join('; ')}.`,
        'finding', [sysRef('overlay-oncology')], 'computed', 'simulation', 'overlay-oncology',
      )];
    }
    case 'oncoforesight': {
      if (r.stage === 'synthesis') {
        const narrative = typeof body.narrative === 'string' ? body.narrative : typeof body.summary === 'string' ? body.summary : null;
        if (!narrative) return [];
        return [candidate(
          `OncoForesight returned an LLM-GENERATED clinical narrative (~${narrative.length} chars) over its calibrated predictors. Model opinion, not a computed result — hypothesis material only.`,
          'method-note', [sysRef('oncoforesight')], 'narrated', 'synthesis', 'oncoforesight', 1,
        )];
      }
      // Stage B counterfactual arm-switch simulation
      const pResp = pct(body.remission?.pResponse);
      const pDur = pct(body.remission?.pDurable12);
      const risk6 = pct(body.resistance?.risk6mo);
      const tox3 = pct(body.toxicity?.pGrade3Any);
      const bri = num(body.toxicity?.benefitRiskIndex);
      const arm = typeof body.armLabel === 'string' ? body.armLabel : String(inputs?.armLabel ?? 'unknown arm');
      const parts: string[] = [];
      if (pResp) parts.push(`P(response) ${pResp}`);
      if (pDur) parts.push(`P(durable 12-mo response) ${pDur}`);
      if (risk6) parts.push(`6-month resistance risk ${risk6}`);
      if (tox3) parts.push(`P(any G3+ toxicity) ${tox3}`);
      if (bri !== null) parts.push(`benefit-risk index ${bri}`);
      if (!parts.length) return [];
      return [candidate(
        `OncoForesight counterfactual arm-switch simulation (arm "${arm}"): ${parts.join(', ')} — computed by its calibrated remission/resistance/toxicity predictors for a patient in its trial database.`,
        'finding', [sysRef('oncoforesight')], 'computed', 'simulation', 'oncoforesight',
      )];
    }
    case 'discourse': {
      const rounds = Array.isArray(body.transcript) ? body.transcript.length : null;
      if (!rounds) return [];
      const verdict = typeof body.verdict === 'string' ? `; verdict: ${body.verdict.slice(0, 140)}` : '';
      return [candidate(
        `Discourse debate produced ${rounds} argument round(s)${verdict}. Argued positions from AI agents — deliberation, not measurement.`,
        'method-note', [sysRef('discourse')], 'narrated', 'synthesis', 'discourse', 0.8,
      )];
    }
    case 'decon': {
      if (r.stage === 'synthesis') {
        const fields = numericFields(body);
        const fracs = Array.isArray(body.fractions) ? body.fractions.length : null;
        if (!fields.length && !fracs) return [];
        return [candidate(
          `Deconvolve+Annotate TME interpretation${fracs ? ` — ${fracs} cell fractions` : ''}: ${fields.join(', ') || 'structured payload returned'}.`,
          'finding', [sysRef('decon')], 'computed', 'synthesis', 'decon',
        )];
      }
      break;
    }
    default:
      return [];
  }
  return [];
}

// Evidence-class assignment for global-pass claims, decided from the refs themselves.
function classifyRefs(refs: EvidenceRef[], contributions: Contribution[]): EvidenceClass {
  if (!refs.length) return 'mixed';
  const allPaper = refs.every(r => r.type === 'paper');
  if (allPaper) return 'literature';
  const systemIds = refs.filter(r => r.type === 'system-output').map(r => r.id);
  if (systemIds.length && refs.every(r => r.type === 'system-output')) {
    const allComputed = systemIds.every(id => {
      const spec = getStageBSpec(id);
      return spec ? spec.evidenceClass === 'computed' : true; // decon/unknown treated conservatively below
    });
    if (allComputed && systemIds.every(id => getStageBSpec(id))) return 'computed';
    if (systemIds.some(id => getStageBSpec(id)?.evidenceClass === 'narrated')) return 'narrated';
  }
  void contributions;
  return 'mixed';
}

export function verifyClaims(
  candidates: ClaimCandidateInput[],
  contributions: Contribution[],
  runId: string,
): Claim[] {
  const resolvable = resolvableRefs(contributions, runId);
  return candidates.map((cand, i) => {
    const refs: EvidenceRef[] = Array.isArray(cand.evidenceRefs) ? cand.evidenceRefs : [];
    const unresolvable = refs.filter(r => !resolvable.has(refKey(r)));
    const evidenceClass = cand.evidenceClass ?? classifyRefs(refs, contributions);
    const resolvedCount = refs.length - unresolvable.length;

    // THEATER REMOVAL (was `cand.confidence ?? 0.95` — a self-report every
    // claim carried, never calibrated). Confidence is now DERIVED from the
    // actual evidence supporting the claim, and explicitly labelled as
    // self-assessed evidence strength — NOT a calibrated probability.
    const depthBonus = cand.evidenceDepth === 'fulltext' ? 0.1 : cand.evidenceDepth === 'abstract' ? 0.05 : 0;
    const classBase: Partial<Record<EvidenceClass, number>> = {
      computed: 0.8,
      literature: 0.65,
      mixed: 0.5,
      narrated: 0.4,
    };
    const base = classBase[evidenceClass] ?? 0.4;
    // Unresolvable refs cap confidence — a claim citing nothing real cannot be
    // high-confidence even if the extractor said so.
    const confidence =
      unresolvable.length > 0
        ? Math.min(0.3, base)
        : Math.min(0.9, base + depthBonus + (resolvedCount >= 1 ? 0.05 : 0));

    // THEATER REMOVAL (was `verified = unresolvable.length === 0 && refs.length > 0`
    // — any claim whose ref resolved was "verified" regardless of whether the
    // referenced system actually produced that kind of evidence. Garbage-in,
    // verified-out.) Now `verified` ALSO requires the claim's evidence class to
    // be consistent with what the referenced systems actually emit:
    //   - a 'computed' claim against a narrated/LLM system is NOT verified;
    //   - a claim whose refs resolve but whose class contradicts the systems
    //     it cites is downgraded, never stamped verified.
    const citedSystemIds = refs.filter(r => r.type === 'system-output').map(r => r.id);
    const classConflict = citedSystemIds.some(id => {
      const spec = getStageBSpec(id);
      if (!spec) return false;
      if (evidenceClass === 'computed' && spec.evidenceClass === 'narrated') return true;
      if (evidenceClass === 'narrated' && spec.evidenceClass === 'computed') return true;
      return false;
    });
    const verified = unresolvable.length === 0 && refs.length > 0 && !classConflict;

    return {
      claimId: `c_${runId}_${i}`,
      runId,
      text: String(cand.text ?? ''),
      kind: cand.kind,
      evidenceRefs: refs,
      evidenceDepth: cand.evidenceDepth,
      evidenceClass,
      stage: cand.stage,
      systemId: cand.systemId,
      validationStatus: evidenceClass === 'computed' || evidenceClass === 'narrated'
        ? validityClass(cand.systemId)
        : undefined,
      confidence,
      verified,
      unresolvableRefs: unresolvable,
      createdAt: new Date().toISOString(),
    };
  });
}

// ── LLM extraction ───────────────────────────────────────────────────────────

function buildEvidenceInventory(contributions: Contribution[]): string {
  const L: string[] = [];
  for (const c of contributions) {
    if (c.kind === 'literature' && c.papers?.length) {
      L.push(`### Papers via ${c.systemId}`);
      for (const p of c.papers) L.push(`- paper:${p.id} — "${p.title}" (${p.source}, ${p.published || 'n.d.'})`);
    } else if (c.kind !== 'offline') {
      const spec = getStageBSpec(c.systemId);
      const marker = spec?.evidenceClass === 'narrated'
        ? ' [LLM-NARRATED OUTPUT — hypothesis material only, never present as a computed result]'
        : spec?.evidenceClass === 'computed'
          ? ' [computed engine output]'
          : '';
      L.push(`- system-output:${c.systemId} — ${c.title}: ${c.detail.slice(0, 120)}${marker}`);
    }
  }
  const priors = loadClaims().slice(-30);
  if (priors.length) {
    L.push('### Prior verified claims (cite sparingly, only if directly building on them)');
    for (const p of priors) L.push(`- claim:${p.claimId} — ${p.text.slice(0, 140)}`);
  }
  return L.join('\n') || '(no evidence available this run)';
}

function buildClaimsPrompt(directive: ResearchDirective, contributions: Contribution[]): string {
  return `You are the claim-extraction engine of a research-command system. From the directive and the evidence inventory below, extract the conclusions of this research run as STRUCTURED CLAIMS.

## DIRECTIVE
Objective: ${directive.objective}
Direction: ${directive.direction}
${directive.hypothesis ? `Standing hypothesis: ${directive.hypothesis}` : ''}

## EVIDENCE INVENTORY (the ONLY valid evidence IDs — cite exactly these strings)
${buildEvidenceInventory(contributions)}

## TASK
Return ONLY valid JSON: { "claims": [ { "text": string, "kind": "background"|"finding"|"hypothesis"|"method-note"|"gap", "evidenceRefs": [ { "type": "paper"|"system-output"|"prior-claim", "id": string } ], "evidenceDepth": "metadata"|"abstract"|"fulltext"|"derived", "confidence": number } ] }

RULES:
- 5 to 12 claims covering: what the evidence shows (background/finding), the primary hypothesis (hypothesis kind — if the directive has one, restate it with its supporting refs), what is missing (gap), and how the fleet was used (method-note).
- Every claim MUST cite at least one evidence ID copied EXACTLY from the inventory. If a statement has no supporting evidence ID, either do not include it or make it a "gap" claim citing the closest system-output.
- Since retrieval provides titles/metadata only, use "metadata" evidenceDepth for paper-grounded claims. Use "derived" only for claims that combine multiple refs by reasoning.
- Do not invent papers, DOIs, findings, or numbers. confidence is 0-1.`;
}

async function extractViaPhoenix(prompt: string): Promise<ClaimCandidateInput[] | null> {
  if (!PHOENIX_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${PHOENIX_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PHOENIX_KEY}` },
      body: JSON.stringify({
        model: CLAIMS_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.1,
        stream: false,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(raw.replace(/^```(?:json)?/m, '').replace(/```$/m, '').trim());
    if (!parsed || !Array.isArray(parsed.claims)) return null;
    const KINDS = new Set(['background', 'finding', 'hypothesis', 'method-note', 'gap']);
    const DEPTHS = new Set(['metadata', 'abstract', 'fulltext', 'derived']);
    return parsed.claims
      .filter((c: any) => typeof c.text === 'string' && c.text.length > 10)
      .map((c: any) => ({
        text: c.text,
        kind: KINDS.has(c.kind) ? c.kind : 'background',
        evidenceRefs: Array.isArray(c.evidenceRefs) ? c.evidenceRefs.filter((r: any) => r && typeof r.id === 'string') : [],
        evidenceDepth: DEPTHS.has(c.evidenceDepth) ? c.evidenceDepth : 'metadata',
        confidence: typeof c.confidence === 'number' ? c.confidence : 0.5,
      }));
  } catch {
    clearTimeout(timer);
    return null;
  }
}

// Deterministic fallback: one claim per retrieved paper set + directive hypothesis. No invention.
function fallbackClaims(directive: ResearchDirective, contributions: Contribution[]): ClaimCandidateInput[] {
  const out: ClaimCandidateInput[] = [];
  const lit = contributions.filter(c => c.kind === 'literature' && c.papers?.length);
  for (const c of lit) {
    out.push({
      text: `Run retrieved ${c.papers!.length} papers via ${c.systemId} (titles/metadata only; not yet read in full).`,
      kind: 'method-note',
      evidenceRefs: [{ type: 'system-output' as const, id: c.systemId }],
      evidenceDepth: 'derived' as const,
      confidence: 1,
    });
  }
  if (directive.hypothesis) {
    const refs = lit.flatMap(c => (c.papers ?? []).slice(0, 3).map(p => ({ type: 'paper' as const, id: p.id })));
    out.push({ text: directive.hypothesis, kind: 'hypothesis', evidenceRefs: refs, evidenceDepth: 'metadata' as const, confidence: 0.5 });
  }
  return out;
}

// ── Orchestration ────────────────────────────────────────────────────────────

export interface ClaimsResult {
  claims: Claim[];
  extractor: 'phoenix' | 'deterministic';
}

export async function extractAndVerifyClaims(
  directive: ResearchDirective,
  contributions: Contribution[],
  runId: string,
  systemCandidates: ClaimCandidateInput[] = [],
): Promise<ClaimsResult> {
  const prompt = buildClaimsPrompt(directive, contributions);
  let globalCandidates = await extractViaPhoenix(prompt);
  let extractor: 'phoenix' | 'deterministic' = 'phoenix';
  if (!globalCandidates || globalCandidates.length === 0) {
    globalCandidates = fallbackClaims(directive, contributions);
    extractor = 'deterministic';
  }
  // Per-system deterministic claims come first (stable IDs, provenance-tagged),
  // then the global synthesis pass over the full inventory.
  const claims = verifyClaims([...systemCandidates, ...globalCandidates], contributions, runId);
  appendClaims(claims);
  return { claims, extractor };
}

// ── Traceability chain (≤2 hops) ─────────────────────────────────────────────

export function claimChain(claimId: string): { claim: Claim; evidence: Array<{ ref: EvidenceRef; resolved: boolean; detail: string }> } | null {
  const claim = getClaim(claimId);
  if (!claim) return null;
  const evidence = claim.evidenceRefs.map(ref => {
    const n = normalizeRef(ref);
    if (ref.type === 'prior-claim') {
      const prior = getClaim(n.id);
      return { ref, resolved: Boolean(prior), detail: prior ? `${prior.kind}: ${prior.text.slice(0, 200)}` : 'prior claim not found' };
    }
    if (ref.type === 'paper') {
      const run = loadRunsSafe();
      const runRec = run.find(r => r.runId === claim.runId);
      const contrib = runRec?.contributions.find(c => c.papers?.some(p => p.id === n.id));
      const paper = contrib?.papers?.find(p => p.id === n.id);
      const payloadRef = findPayloadRef(runRec, contrib?.systemId ?? '');
      const payloadOk = payloadRef && fs.existsSync(path.join(LEDGER_DIR, payloadRef.file));
      return {
        ref,
        resolved: Boolean(paper),
        detail: paper ? `"${paper.title}" (${paper.source}, ${paper.published || 'n.d.'}) ${paper.url} · payload ${payloadOk ? 'archived+hashed' : 'missing'}` : 'paper not in run contributions',
      };
    }
    // system-output
    const candidates = payloadPathCandidates(claim.runId, n.id);
    const found = candidates.find(p => fs.existsSync(p));
    return { ref, resolved: Boolean(found), detail: found ? `payload archived at ${path.relative(LEDGER_DIR, found).replace(/\\/g, '/')}` : 'payload missing' };
  });
  return { claim, evidence };
}

function loadRunsSafe(): Array<{ runId: string; contributions: Contribution[]; rawPayloadRefs: Array<{ systemId: string; file: string }> }> {
  const f = path.join(LEDGER_DIR, 'runs.jsonl');
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf-8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
}

// Stage-aware payload archive names: legacy `<systemId>.json`, newer
// `<stage>-<systemId>.json` for systems dispatched in multiple stages.
function payloadPathCandidates(runId: string, systemId: string): string[] {
  return [
    path.join(LEDGER_DIR, 'payloads', runId, `${systemId}.json`),
    path.join(LEDGER_DIR, 'payloads', runId, `simulation-${systemId}.json`),
    path.join(LEDGER_DIR, 'payloads', runId, `literature-${systemId}.json`),
  ];
}

function findPayloadRef(runRec: { rawPayloadRefs: Array<{ systemId: string; file: string }> } | undefined, systemId: string) {
  return runRec?.rawPayloadRefs.find(r => r.systemId === systemId || r.systemId.endsWith(`-${systemId}`));
}
