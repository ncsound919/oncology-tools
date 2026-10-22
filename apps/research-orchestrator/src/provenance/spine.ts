import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256 } from '../ledger.js';
import { canonicalize } from '../srt/registry.js';

// ── Phase 4: provenance spine ─────────────────────────────────────────────────
// A hash-chained, RO-Crate-shaped record of a run: every input/code/output as a
// content-addressed entity, chained to its predecessor so any edit breaks the
// chain. An RFC-3161 timestamp anchor is optional and fail-closed (an unavailable
// TSA or an unverifiable token is reported, never faked). A Manubot-style citation
// block is emitted for the referenced sources.

export type SpineEntityRole = 'input' | 'code' | 'output' | 'dataset' | 'paper';

export interface SpineEntity {
  role: SpineEntityRole;
  id: string;
  sha256: string;
}

export interface TimestampAnchor {
  /**
   * True ONLY when a token was issued AND `openssl ts -verify` confirmed its
   * message imprint and signature. A stamp alone is not an anchor: an unsigned or
   * mismatched token is exactly what an attacker can return.
   */
  anchored: boolean;
  /** Path to the DER TimeStampToken on disk (binary, not a JSON field). */
  tokenPath?: string;
  tsa?: string;
  /** genTime from the *verified* token. */
  genTime?: string;
  /** true only after signature AND imprint verification succeeded. */
  verified?: boolean;
  error?: string;
}

export interface ProvenanceSpine {
  schemaVersion: 1;
  runId: string;
  createdAt: string;
  entities: SpineEntity[];
  /** Hash of the parent spine (the previous run), or null for the genesis. */
  prevHash: string | null;
  /** Hash over {runId, entities, prevHash} — the chain link. */
  hash: string;
  doiRefs: string[];
  manubot: string;
  tsa?: TimestampAnchor;
}

export function entity(role: SpineEntityRole, id: string, content: string | Buffer): SpineEntity {
  return { role, id, sha256: sha256(content) };
}

/** Deterministic hash over the spine's chained content (excluding the tsa). */
export function spineHash(runId: string, entities: SpineEntity[], prevHash: string | null): string {
  return sha256(canonicalize({ runId, entities, prevHash }));
}

/** Build a spine, linking to a previous spine's hash when supplied. */
export function buildProvenanceSpine(args: {
  runId: string;
  entities: SpineEntity[];
  prev?: ProvenanceSpine | null;
  doiRefs?: string[];
  createdAt?: string;
}): ProvenanceSpine {
  const prevHash = args.prev?.hash ?? null;
  const hash = spineHash(args.runId, args.entities, prevHash);
  const doiRefs = args.doiRefs ?? [];
  return {
    schemaVersion: 1,
    runId: args.runId,
    createdAt: args.createdAt ?? new Date().toISOString(),
    entities: args.entities,
    prevHash,
    hash,
    doiRefs,
    manubot: manubotCitations(doiRefs),
  };
}

/** Manubot cite-by-id block: `[@doi:10.…]` markers, one per line. */
export function manubotCitations(refs: string[]): string {
  return refs
    .filter((r) => typeof r === 'string' && r.trim())
    .map((r) => (r.startsWith('doi:') ? `[@${r}]` : `[@doi:${r}]`))
    .join('\n');
}

/** Verify a spine chain: each link must hash to its recorded hash. */
export function verifySpineChain(spines: ProvenanceSpine[]): { ok: boolean; broken: Array<{ runId: string; reason: string }> } {
  const broken: Array<{ runId: string; reason: string }> = [];
  let prev: ProvenanceSpine | null = null;
  for (const s of spines) {
    if (s.prevHash !== (prev?.hash ?? null)) {
      broken.push({ runId: s.runId, reason: `prevHash mismatch (expected ${prev?.hash ?? 'null'})` });
    }
    if (spineHash(s.runId, s.entities, s.prevHash) !== s.hash) {
      broken.push({ runId: s.runId, reason: 'content hash mismatch' });
    }
    prev = s;
  }
  return { ok: broken.length === 0, broken };
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Single source of truth for "is this a digest we can anchor". */
export function isSha256Hex(value: string): boolean {
  return SHA256_HEX.test(value);
}

export const DEFAULT_TSA = 'https://freetsa.org/tsr';

export interface TsaRun {
  status: number;
  stdout: string;
}
/** Injectable so the contract is unit-testable without python, openssl or a network. */
export type TsaRunner = (args: string[]) => TsaRun;

/**
 * Locate the ecosystem's ONE RFC-3161 engine.
 *
 * The crypto lives in `platform/scripts/engines/tsa_prove.py` (rfc3161ng to stamp,
 * `openssl ts -verify -digest -CAfile` to verify). This module is a *client* of
 * that script, exactly like `platform/lib/timestamp.ts` — not a second
 * implementation. A second implementation is what produced the spoofable anchor
 * this replaced, so: extend the owner, do not reimplement it.
 */
export function findTsaEngine(start = dirname(fileURLToPath(import.meta.url))): string | null {
  const override = process.env.TSA_PROVE_SCRIPT;
  if (override && existsSync(override)) return override;
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'platform', 'scripts', 'engines', 'tsa_prove.py');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function enginePython(scriptPath: string): string {
  const override = process.env.TSA_PYTHON;
  if (override) return override;
  const platformRoot = resolve(dirname(scriptPath), '..', '..');
  const win = join(platformRoot, '.venv', 'Scripts', 'python.exe');
  const posix = join(platformRoot, '.venv', 'bin', 'python');
  if (existsSync(win)) return win;
  if (existsSync(posix)) return posix;
  return 'python';
}

export function defaultTsaRunner(scriptPath: string): TsaRunner {
  const python = enginePython(scriptPath);
  return (args) => {
    const r = spawnSync(python, [scriptPath, ...args], { encoding: 'utf8' });
    return { status: r.status ?? 1, stdout: r.stdout ?? '' };
  };
}

function parseVerdict(stdout: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(stdout.trim());
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function refuseReason(verdict: Record<string, unknown> | null, run: TsaRun, phase: string): string {
  if (verdict && typeof verdict.error === 'string') return verdict.error;
  return `${phase} produced no parseable verdict (exit ${run.status})`;
}

/**
 * Anchor a sha256 digest with an RFC-3161 timestamp — stamp AND verify.
 *
 * Verification is not optional. `tsa_prove.py stamp` returns a token, but a token
 * proves nothing until its message imprint and TSA signature are checked against
 * the digest being anchored; an endpoint can return any bytes it likes. So this
 * calls `verify` and only reports `anchored: true` when openssl confirmed it.
 * (The platform's `stampHash`/`verifyStampedHash` split the two steps; this
 * function deliberately does not, because the failure mode of a caller forgetting
 * the second step is the exact defect that was here before.)
 *
 * Fail-closed: a missing engine, a non-hex digest, an unreachable TSA or a bad
 * token all return `{anchored: false, error}`, never a bare success.
 */
export function anchorTimestamp(
  hash: string,
  opts: { tokenPath?: string; tsa?: string; runner?: TsaRunner; engine?: string | null } = {},
): TimestampAnchor {
  if (!isSha256Hex(hash)) {
    return { anchored: false, error: 'hash must be a 64-char lowercase sha256 hex' };
  }
  const engine = opts.engine !== undefined ? opts.engine : findTsaEngine();
  if (!engine) {
    return {
      anchored: false,
      error:
        'TSA engine not found. Set TSA_PROVE_SCRIPT to platform/scripts/engines/tsa_prove.py. ' +
        'There is exactly one RFC-3161 implementation in this ecosystem; do not add another.',
    };
  }
  const tsa = opts.tsa ?? process.env.RFC3161_TSA_URL ?? DEFAULT_TSA;
  const tokenPath = opts.tokenPath ?? join(tmpdir(), `spine-${hash.slice(0, 16)}.tsr`);
  const runner = opts.runner ?? defaultTsaRunner(engine);

  const stampRun = runner(['stamp', '--hash', hash, '--tsa', tsa, '--token-out', tokenPath]);
  const stampVerdict = parseVerdict(stampRun.stdout);
  if (!stampVerdict || stampVerdict.ok !== true) {
    return { anchored: false, tsa, error: refuseReason(stampVerdict, stampRun, 'stamp') };
  }

  const verifyRun = runner(['verify', '--hash', hash, '--token', tokenPath, '--tsa', tsa]);
  const verifyVerdict = parseVerdict(verifyRun.stdout);
  if (!verifyVerdict || verifyVerdict.ok !== true) {
    return {
      anchored: false,
      tsa,
      tokenPath,
      error: refuseReason(verifyVerdict, verifyRun, 'verify'),
    };
  }

  return {
    anchored: true,
    verified: verifyVerdict.signature_ok === true && verifyVerdict.imprint_ok === true,
    tokenPath,
    tsa,
    genTime: String(verifyVerdict.genTime ?? stampVerdict.genTime ?? ''),
  };
}


