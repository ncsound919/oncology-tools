// ── Notebook submission gate ──────────────────────────────────────────────────
// Deterministic, pre-submission checks for a Kaggle notebook before it leaves the
// orchestrator. Implements two invariants the ecosystem already relies on:
//   * the lane only credits a job that prints the `__RECOURSE_RESULT__` envelope
//     (KAGGLE-INTEGRATION-2026-10, "return only the envelope"); and
//   * a notebook must never embed a secret (KAGGLE-INTEGRATION §4).
// Plus reproducibility warnings. Pure; accepts Jupyter (`source: string[]`) or the
// Recourse cell shape (`source: string`).

export interface GateCell {
  type?: string;
  source: string | string[];
}

export interface GateFinding {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  cellIndex?: number;
}

export interface NotebookGateResult {
  ok: boolean;
  errors: GateFinding[];
  warnings: GateFinding[];
}

const SECRET_PATTERNS: Array<{ code: string; re: RegExp; message: string }> = [
  { code: 'api-key-literal', re: /\bsk-[A-Za-z0-9]{16,}\b/, message: 'looks like an API key literal' },
  { code: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, message: 'an embedded private key' },
  { code: 'assigned-secret', re: /(?:api[_-]?key|secret|token|password|passwd)["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i, message: 'a secret is assigned to a string literal' },
  { code: 'kaggle-key', re: /KAGGLE_KEY\s*=\s*["'][^"']+["']/i, message: 'a Kaggle key literal' },
];

function cellSource(c: GateCell): string {
  return Array.isArray(c.source) ? c.source.join('\n') : String(c.source ?? '');
}

export function verifyNotebook(cells: GateCell[], opts: { requireEnvelope?: boolean } = {}): NotebookGateResult {
  const errors: GateFinding[] = [];
  const warnings: GateFinding[] = [];
  const requireEnvelope = opts.requireEnvelope ?? true;
  const sources = cells.map(cellSource);
  const joined = sources.join('\n');

  if (cells.length === 0) {
    errors.push({ code: 'empty-notebook', severity: 'error', message: 'notebook has no cells' });
  }
  if (requireEnvelope && !joined.includes('__RECOURSE_RESULT__')) {
    errors.push({ code: 'no-envelope', severity: 'error', message: 'notebook never prints the __RECOURSE_RESULT__ envelope the lane parses' });
  }
  sources.forEach((src, i) => {
    if (!src.trim()) warnings.push({ code: 'empty-cell', severity: 'warning', message: 'empty cell', cellIndex: i });
    for (const p of SECRET_PATTERNS) {
      if (p.re.test(src)) errors.push({ code: p.code, severity: 'error', message: p.message, cellIndex: i });
    }
    if (/\bpip\b/.test(src) && /\binstall\b/.test(src)) {
      warnings.push({ code: 'runtime-pip', severity: 'warning', message: 'installs a package at runtime (network + a moving image)', cellIndex: i });
    }
  });
  if (/\bnp\.random\./.test(joined) && !/default_rng\(|\.seed\(|random_state/.test(joined)) {
    warnings.push({ code: 'unseeded-random', severity: 'warning', message: 'uses np.random without a visible seed — not reproducible' });
  }
  return { ok: errors.length === 0, errors, warnings };
}