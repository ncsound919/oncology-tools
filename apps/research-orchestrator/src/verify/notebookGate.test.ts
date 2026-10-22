import { describe, it, expect } from 'vitest';
import { verifyNotebook } from './notebookGate.js';

const GOOD = [
  { type: 'code', source: 'import json as _rc_json\nprint("__RECOURSE_RESULT__ " + _rc_json.dumps({"ok": True}))' },
];

describe('notebook submission gate', () => {
  it('passes a notebook that prints the envelope', () => {
    const r = verifyNotebook(GOOD);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('fails when the envelope is missing', () => {
    const r = verifyNotebook([{ type: 'code', source: 'print("hi")' }]);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'no-envelope')).toBe(true);
  });

  it('fails on an embedded secret, in several shapes', () => {
    const key = verifyNotebook([{ type: 'code', source: 'OPENAI = "sk-abcdefghijklmnop12345"\nprint("__RECOURSE_RESULT__ {}")' }]);
    expect(key.errors.some((e) => e.code === 'api-key-literal')).toBe(true);
    const assigned = verifyNotebook([{ type: 'code', source: 'config = {"api_key": "supersecretvalue"}\nprint("__RECOURSE_RESULT__ {}")' }]);
    expect(assigned.errors.some((e) => e.code === 'assigned-secret')).toBe(true);
    const priv = verifyNotebook([{ type: 'code', source: 'KEY = """-----BEGIN RSA PRIVATE KEY-----"""\nprint("__RECOURSE_RESULT__ {}")' }]);
    expect(priv.errors.some((e) => e.code === 'private-key')).toBe(true);
    const kaggle = verifyNotebook([{ type: 'code', source: 'KAGGLE_KEY = "abc123"\nprint("__RECOURSE_RESULT__ {}")' }]);
    expect(kaggle.errors.some((e) => e.code === 'kaggle-key')).toBe(true);
  });

  it('warns about runtime pip and unseeded randomness but does not fail', () => {
    const r = verifyNotebook([
      { type: 'code', source: 'import subprocess, sys\nsubprocess.run([sys.executable, "-m", "pip", "install", "-q", "lifelines"])' },
      { type: 'code', source: 'import numpy as np\nx = np.random.normal(0, 1, 10)\nprint("__RECOURSE_RESULT__ " + str(x[0]))' },
    ]);
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.code === 'runtime-pip')).toBe(true);
    expect(r.warnings.some((w) => w.code === 'unseeded-random')).toBe(true);
  });

  it('does not warn about randomness when a seed is visible', () => {
    const r = verifyNotebook([{ type: 'code', source: 'import numpy as np\nrng = np.random.default_rng(0)\nprint("__RECOURSE_RESULT__ " + str(rng.normal()))' }]);
    expect(r.warnings.some((w) => w.code === 'unseeded-random')).toBe(false);
  });

  it('accepts Jupyter `source: string[]` and can skip the envelope for a benchmark task', () => {
    const jupyter = [{ cell_type: 'code', source: ['import kaggle_benchmarks as kbench\n', '@kbench.task(name="t")\n', 'def t(llm):\n', '    pass\n'] }];
    const r = verifyNotebook(jupyter, { requireEnvelope: false });
    expect(r.ok).toBe(true);
    expect(verifyNotebook(jupyter).errors.some((e) => e.code === 'no-envelope')).toBe(true);
  });
});