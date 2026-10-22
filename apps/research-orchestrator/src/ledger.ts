import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ArtifactRef, DispatchResult, PayloadRef, RunManifest } from './types.js';

// ── Ledger (Phase 1) ─────────────────────────────────────────────────────────
// Append-only run manifests + verbatim payload archive with sha256 integrity.
// Never store secrets: envHash fingerprints non-secret config only.

const LEDGER_DIR = path.join(process.cwd(), 'data', 'ledger');
const RUNS_FILE = path.join(LEDGER_DIR, 'runs.jsonl');
const PAYLOADS_DIR = path.join(LEDGER_DIR, 'payloads');

export function ensureLedger(): void {
  fs.mkdirSync(LEDGER_DIR, { recursive: true });
  fs.mkdirSync(PAYLOADS_DIR, { recursive: true });
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function nonSecretEnvHash(): string {
  const cfg = {
    phoenixBaseUrl: (process.env.PHOENIX_BASE_URL ?? 'https://api.pgsgrove.com/v1'),
    phoenixSynthModel: process.env.PHOENIX_SYNTH_MODEL ?? 'glm-5.3-flash',
    ollamaBase: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    orchestratorPort: process.env.ORCHESTRATOR_PORT ?? '8099',
  };
  return sha256(JSON.stringify(cfg));
}

// Archive each raw dispatch body verbatim. Returns refs with integrity hashes.
// Stage-aware filenames: a system dispatched in multiple stages (e.g.
// overlay-oncology in literature AND simulation) gets one file per stage.
export function archivePayloads(runId: string, results: DispatchResult[]): PayloadRef[] {
  const dir = path.join(PAYLOADS_DIR, runId);
  fs.mkdirSync(dir, { recursive: true });
  const refs: PayloadRef[] = [];
  for (const r of results) {
    const raw = typeof r.body === 'string' ? r.body : JSON.stringify(r.body ?? (r.error ? { error: r.error } : null), null, 2);
    const prefix = r.stage && r.stage !== 'probe' ? `${r.stage}-` : '';
    const file = path.join('payloads', runId, `${prefix}${r.systemId}.json`);
    const content = raw ?? '';
    fs.writeFileSync(path.join(LEDGER_DIR, file), content);
    refs.push({ systemId: `${prefix}${r.systemId}`, sha256: sha256(content), file });
  }
  return refs;
}

export function appendRun(manifest: RunManifest): void {
  ensureLedger();
  fs.appendFileSync(RUNS_FILE, JSON.stringify(manifest) + '\n');
}

export interface RunRecord extends RunManifest { _line: number }

export function loadRuns(): RunRecord[] {
  if (!fs.existsSync(RUNS_FILE)) return [];
  const out: RunRecord[] = [];
  const lines = fs.readFileSync(RUNS_FILE, 'utf-8').split('\n').filter(Boolean);
  lines.forEach((line, i) => {
    try { out.push({ ...JSON.parse(line), _line: i }); } catch { /* corrupt line skipped, never fatal */ }
  });
  return out;
}

// A runId may have multiple manifest lines (supersede chain); latest wins.
export function getRun(runId: string): RunRecord | null {
  const matches = loadRuns().filter(r => r.runId === runId);
  return matches.length ? matches[matches.length - 1]! : null;
}

// Verify every payload + artifact ref against its recorded sha256.
export function verifyRun(runId: string): { runId: string; ok: boolean; checked: number; broken: Array<{ file: string; expected: string; actual: string }> } {
  const run = getRun(runId);
  if (!run) return { runId, ok: false, checked: 0, broken: [{ file: '<manifest>', expected: 'exists', actual: 'missing' }] };
  const refs: Array<{ file: string; sha256: string }> = [
    ...run.rawPayloadRefs.map(r => ({ file: r.file, sha256: r.sha256 })),
    ...run.artifactRefs.map(r => ({ file: r.file, sha256: r.sha256 })),
  ];
  const broken: Array<{ file: string; expected: string; actual: string }> = [];
  for (const ref of refs) {
    const p = path.join(LEDGER_DIR, ref.file);
    if (!fs.existsSync(p)) { broken.push({ file: ref.file, expected: ref.sha256.slice(0, 12), actual: 'missing' }); continue; }
    const actual = sha256(fs.readFileSync(p));
    if (actual !== ref.sha256) broken.push({ file: ref.file, expected: ref.sha256.slice(0, 12), actual: actual.slice(0, 12) });
  }
  return { runId, ok: broken.length === 0, checked: refs.length, broken };
}

export function hashArtifact(relPath: string, content: string): ArtifactRef {
  return { kind: guessKind(relPath), sha256: sha256(content), file: relPath };
}

function guessKind(relPath: string): ArtifactRef['kind'] {
  if (relPath.endsWith('.spec.md')) return 'spec';
  if (relPath.endsWith('.dispatch.md')) return 'dispatch';
  if (relPath.endsWith('.paper.md') || relPath.endsWith('.layman.md')) return 'paper';
  return 'report';
}
