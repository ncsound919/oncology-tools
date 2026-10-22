import fs from 'node:fs';
import path from 'node:path';
import {
  type RegistryDoc,
  type HypothesisRecord,
  type HypothesisStatus,
  type NewHypothesisInput,
  type PreregistrationInput,
  type HypothesisOutcome,
  createRegistry,
  parseRegistry,
  serializeRegistry,
  upsertHypothesis,
  preregister as preregisterPure,
  recordOutcome as recordOutcomePure,
  retract as retractPure,
  nullLedger as nullLedgerPure,
  getHypothesis,
} from './registry.js';
import type { RunCard } from './experiment.js';

// ── SRT store ────────────────────────────────────────────────────────────────
// Two files under data/srt/: hypotheses.json (the registry) and runs.json (run
// cards). Every mutation is a read-modify-write through the pure registry
// functions, so the tested logic is the only logic; this file is the thin edge.

export class SrtStore {
  private readonly dir: string;
  private readonly hypFile: string;
  private readonly runFile: string;

  constructor(dir: string = path.join(process.cwd(), 'data', 'srt')) {
    this.dir = dir;
    this.hypFile = path.join(dir, 'hypotheses.json');
    this.runFile = path.join(dir, 'runs.json');
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }

  private readJson<T>(file: string, fallback: T): T {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
    } catch {
      return fallback;
    }
  }

  private writeJson(file: string, value: unknown): void {
    this.ensureDir();
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, file);
  }

  readRegistry(): RegistryDoc {
    if (!fs.existsSync(this.hypFile)) return createRegistry();
    return parseRegistry(fs.readFileSync(this.hypFile, 'utf-8'));
  }

  writeRegistry(doc: RegistryDoc): void {
    this.writeJson(this.hypFile, JSON.parse(serializeRegistry(doc)));
  }

  readRuns(): RunCard[] {
    return this.readJson<RunCard[]>(this.runFile, []);
  }

  writeRuns(runs: RunCard[]): void {
    this.writeJson(this.runFile, runs);
  }

  list(filter: { status?: HypothesisStatus } = {}): HypothesisRecord[] {
    const all = this.readRegistry().hypotheses;
    return filter.status ? all.filter((h) => h.status === filter.status) : all;
  }

  get(id: string): HypothesisRecord | undefined {
    return getHypothesis(this.readRegistry(), id);
  }

  upsert(input: NewHypothesisInput): { hypothesis: HypothesisRecord; created: boolean } {
    const { doc, hypothesis, created } = upsertHypothesis(this.readRegistry(), input);
    this.writeRegistry(doc);
    return { hypothesis, created };
  }

  preregister(id: string, spec: Omit<PreregistrationInput, 'title' | 'mechanism'>): HypothesisRecord {
    const { doc, hypothesis } = preregisterPure(this.readRegistry(), id, spec);
    this.writeRegistry(doc);
    return hypothesis;
  }

  recordOutcome(id: string, outcome: Omit<HypothesisOutcome, 'at'>): HypothesisRecord {
    const { doc, hypothesis } = recordOutcomePure(this.readRegistry(), id, outcome);
    this.writeRegistry(doc);
    return hypothesis;
  }

  retract(id: string, reason: string): HypothesisRecord {
    const { doc, hypothesis } = retractPure(this.readRegistry(), id, reason);
    this.writeRegistry(doc);
    return hypothesis;
  }

  addRunCard(card: RunCard): RunCard {
    const runs = this.readRuns().filter((r) => r.id !== card.id);
    runs.push(card);
    this.writeRuns(runs);
    return card;
  }

  listRuns(hypothesisId?: string): RunCard[] {
    const runs = this.readRuns();
    return hypothesisId ? runs.filter((r) => r.hypothesisId === hypothesisId) : runs;
  }

  nullLedger(): HypothesisRecord[] {
    return nullLedgerPure(this.readRegistry());
  }

  applyDoc(doc: RegistryDoc): void {
    this.writeRegistry(doc);
  }
}
