import fs from 'node:fs';
import path from 'node:path';
import type { WorldModel } from './model.js';

// ── World model store ─────────────────────────────────────────────────────────
// One JSON file per study under data/world/. Snapshots are overwritten (the model
// is a derived view, not an append-only ledger — the ledger is the source of
// truth and is never rewritten).

export class WorldStore {
  private readonly dir: string;

  constructor(dir: string = path.join(process.cwd(), 'data', 'world')) {
    this.dir = dir;
  }

  private file(studyId: string): string {
    const safe = studyId.replace(/[^a-zA-Z0-9_.-]/g, '_');
    return path.join(this.dir, `${safe}.json`);
  }

  save(model: WorldModel): void {
    fs.mkdirSync(this.dir, { recursive: true });
    const file = this.file(model.studyId);
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(model, null, 2));
    fs.renameSync(tmp, file);
  }

  load(studyId: string): WorldModel | null {
    try {
      return JSON.parse(fs.readFileSync(this.file(studyId), 'utf-8')) as WorldModel;
    } catch {
      return null;
    }
  }

  list(): Array<{ studyId: string; objective: string; generatedAt: string; hypotheses: number; tasks: number }> {
    if (!fs.existsSync(this.dir)) return [];
    const out: Array<{ studyId: string; objective: string; generatedAt: string; hypotheses: number; tasks: number }> = [];
    for (const f of fs.readdirSync(this.dir).filter((x) => x.endsWith('.json'))) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf-8')) as WorldModel;
        out.push({ studyId: m.studyId, objective: m.objective, generatedAt: m.generatedAt, hypotheses: m.hypotheses.length, tasks: 0 });
      } catch {
        /* skip unreadable */
      }
    }
    return out.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }
}