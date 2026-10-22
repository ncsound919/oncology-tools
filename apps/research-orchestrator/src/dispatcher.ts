import type { DispatchResult, IngestionControls, SystemId } from './types.js';
import type { FleetSystem } from './types.js';

const TIMEOUT_MS = 12_000;
// Stage A fan-out is literature ingestion; per-run results are tagged so the
// manifest can separate what the pipeline stage produced.
const STAGE_A = 'literature' as const;

function timeoutSignal(ms: number): AbortSignal {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export async function healthCheck(sys: FleetSystem): Promise<{ ok: boolean; ms: number; status?: number }> {
  if (!sys.baseUrl || !sys.healthPath) return { ok: true, ms: 0 }; // CLI-only counts as ok
  const t0 = Date.now();
  try {
    const r = await fetch(`${sys.baseUrl}${sys.healthPath}`, { signal: timeoutSignal(4000) });
    return { ok: r.ok, ms: Date.now() - t0, status: r.status };
  } catch {
    return { ok: false, ms: Date.now() - t0 };
  }
}

export async function dispatchToSystem(
  sys: FleetSystem,
  study: { title: string; query: string; domain: string; ingestion: IngestionControls }
): Promise<DispatchResult> {
  const t0 = Date.now();
  // Route per system — every branch is fail-soft and returns a DispatchResult, never throws.
  try {
    if (sys.id === 'overlay-oncology') {
      // Single call that fans out inside oncology (frontier + events + mechanism)
      const r = await fetch(`${sys.baseUrl}/api/frontier-alignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_domain: study.domain,
          query: study.query,
          page_size: study.ingestion.pageSize,
          // pass ingestion hints the route will pick up as filters
          sources: study.ingestion.sources,
          date_from: study.ingestion.dateFrom,
          date_to: study.ingestion.dateTo,
          include_preprints: study.ingestion.includePreprints,
        }),
        signal: timeoutSignal(TIMEOUT_MS),
      });
      const body = await r.json().catch(() => ({}));
      // apply ingestion controls client-side where the upstream doesn't honor them yet
      let b: any = body;
      if (b.papers && Array.isArray(b.papers)) {
        if (study.ingestion.dedup) {
          const seen = new Set<string>();
          b.papers = b.papers.filter((p: any) => {
            const k = (p.doi ?? p.id ?? p.title ?? '').toLowerCase();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
        }
        if (b.papers.length > study.ingestion.maxPapers) b.papers = b.papers.slice(0, study.ingestion.maxPapers);
        if (b.metrics) {
          b.metrics.papers_retrieved = b.papers.length;
          b.metrics.papers_ingested = b.papers.length;
        }
      }
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body: b, stage: STAGE_A, evidenceClass: 'literature' };
    }
    if (sys.id === 'decon') {
      const r = await fetch(`${sys.baseUrl}/api/decon-annotate/interpret`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: study.query }),
        signal: timeoutSignal(TIMEOUT_MS),
      });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: 'simulation' };
    }
    if (sys.id === 'biocomposable') {
      const r = await fetch(`${sys.baseUrl}/agent/v1/evidence`, {
        signal: timeoutSignal(TIMEOUT_MS),
      });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: STAGE_A, evidenceClass: 'literature' };
    }
    if (sys.id === 'metamap') {
      const r = await fetch(`${sys.baseUrl}/api/health`, { signal: timeoutSignal(TIMEOUT_MS) });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: 'probe' };
    }
    if (sys.id === 'discourse') {
      const r = await fetch(`${sys.baseUrl}/api/debates`, { signal: timeoutSignal(TIMEOUT_MS) });
      const body = await r.json().catch(() => ({}));
      // If no debates, count health as ok; this system is debate-spawn on demand.
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: 'probe' };
    }
    if (sys.id === 'attec') {
      const r = await fetch(`${sys.baseUrl}/api/health`, { signal: timeoutSignal(TIMEOUT_MS) });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: 'probe' };
    }
    // OSS sidecars — fail-soft probes. Ingest pipeline calls them before the main fan-out;
    // if offline they just report offline and the report notes "start via docker compose".
    if (sys.id === 'stirling-pdf') {
      const r = await fetch(`${sys.baseUrl}${sys.healthPath ?? '/api/v1/info/status'}`, { signal: timeoutSignal(4000) });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body: r.ok ? { note: 'Stirling-PDF ready — PDF OCR/extract/merge', info: body } : body, stage: 'probe' };
    }
    if (sys.id === 'open-notebook') {
      const r = await fetch(`${sys.baseUrl}${sys.healthPath ?? '/api/health'}`, { signal: timeoutSignal(4000) });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body: r.ok ? { note: 'open-notebook ready — notebook synthesis over ingested papers', info: body } : body, stage: 'probe' };
    }
    if (sys.id === 'scrapling') {
      const r = await fetch(`${sys.baseUrl}${sys.healthPath ?? '/health'}`, { signal: timeoutSignal(4000) });
      const body = await r.json().catch(() => ({}));
      return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body: r.ok ? { note: 'Scrapling ready — stealth scrape fallback for PubMed/bioRxiv when Europe PMC throttles', info: body } : body, stage: 'probe' };
    }
    // CLI-only or generic health probe for the rest
    if (!sys.baseUrl) {
      return { systemId: sys.id, ok: true, latencyMs: Date.now() - t0, body: { note: 'CLI-only system, dispatch is via local probes', query: study.query }, stage: 'probe' };
    }
    const r = await fetch(sys.baseUrl, { signal: timeoutSignal(TIMEOUT_MS) });
    const body = await r.text().then(t => t.slice(0, 2000)).catch(() => '');
    return { systemId: sys.id, ok: r.ok, latencyMs: Date.now() - t0, httpStatus: r.status, body, stage: 'probe' };
  } catch (e: any) {
    return { systemId: sys.id, ok: false, latencyMs: Date.now() - t0, error: e?.message ?? String(e), stage: 'probe' };
  }
}

export async function dispatchAll(
  systems: FleetSystem[],
  study: { title: string; query: string; domain: string; ingestion: IngestionControls }
): Promise<DispatchResult[]> {
  // Bounded concurrency 4 at a time so a single slow system doesn't starve the run.
  const out: DispatchResult[] = [];
  for (let i = 0; i < systems.length; i += 4) {
    const chunk = systems.slice(i, i + 4);
    const res = await Promise.all(chunk.map(s => dispatchToSystem(s, study)));
    out.push(...res);
  }
  return out;
}
