import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SrtStore } from './store.js';
import { buildRunCard } from './experiment.js';

const SPEC = {
  dataPlan: 'locked cohort',
  analysisPlan: 'paired bootstrap',
  holdout: '30% by patient',
  primaryOutcome: 'flip rate',
  successCriterion: 'flip rate <= 0.20',
  falsifier: 'flip rate > 0.20',
};

const dirs: string[] = [];
function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srt-orch-'));
  dirs.push(dir);
  return dir;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe('SrtStore', () => {
  it('persists the registry across instances', () => {
    const dir = tempDir();
    const store = new SrtStore(dir);
    const { hypothesis } = store.upsert({ title: 'Persisted', mechanism: 'm' });
    store.preregister(hypothesis.id, SPEC);
    const reopened = new SrtStore(dir);
    expect(reopened.get(hypothesis.id)?.status).toBe('preregistered');
    expect(reopened.list()).toHaveLength(1);
  });

  it('records outcomes into the null ledger', () => {
    const store = new SrtStore(tempDir());
    const { hypothesis } = store.upsert({ title: 'Null-able', mechanism: 'm' });
    store.preregister(hypothesis.id, SPEC);
    store.recordOutcome(hypothesis.id, { verdict: 'falsified', metric: 0.41 });
    expect(store.nullLedger().map((h) => h.id)).toEqual([hypothesis.id]);
  });

  it('persists run cards and is idempotent on id', () => {
    const store = new SrtStore(tempDir());
    const { hypothesis } = store.upsert({ title: 'Runnable', mechanism: 'Reaction kinetics' });
    const locked = store.preregister(hypothesis.id, SPEC);
    const card = buildRunCard(locked, locked.preregistration!);
    store.addRunCard(card);
    store.addRunCard(card);
    expect(store.listRuns(hypothesis.id)).toHaveLength(1);
  });

  it('a malformed registry file yields an empty registry, not a throw', () => {
    const dir = tempDir();
    const store = new SrtStore(dir);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'hypotheses.json'), '{ not json');
    expect(store.list()).toEqual([]);
  });
});
