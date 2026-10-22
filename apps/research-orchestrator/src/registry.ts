import type { FleetSystem, SystemId } from './types.js';

// Canonical repo root (BUSINESS consolidation) — all registered systems live here.
const ROOT = 'C:/Users/User/Downloads/BUSINESS/SCIENCE/Oncology Ecosystem';

export const REGISTRY: FleetSystem[] = [
  // :3070 is the fleet convention (Keywire ecosystem.ts, recourse oncologyEngineBridge,
  // and the pm2 sidecar all agree). The old :3000 default collided with an existing
  // listener on 3000 and shared the exact mistake the bridge's own header documents.
  { id: 'overlay-oncology', name: 'Overlay Oncology', root: `${ROOT}/platform`, baseUrl: process.env.ONCOLOGY_URL ?? 'http://localhost:3070', healthPath: '/api/brain-status', domains: ['oncology','clinical','tme','chem','genomics','literature'], runHint: 'npm run dev (binds 3070)', kind: 'primary' },
  { id: 'oncograph',        name: 'Oncograph',         root: `${ROOT}/platform/components/Oncograph`,        baseUrl: process.env.ONCOGRAPH_URL ?? 'http://localhost:3001', healthPath: null, domains: ['oncology','tumor','mutation'], runHint: 'npm run dev', kind: 'primary' },
  { id: 'oncoforesight',    name: 'OncoForesight',     root: `${ROOT}/platform/components/OncoForesight`,    baseUrl: process.env.ONCOFORESIGHT_URL ?? 'http://localhost:3002', healthPath: null, domains: ['oncology','remission','resistance'], runHint: 'npm run dev', kind: 'primary' },
  { id: 'decon',            name: 'Decon',             root: `${ROOT}/platform/components/Decon`,            baseUrl: process.env.DECON_URL ?? 'http://localhost:3003', healthPath: '/api/decon-annotate/health', domains: ['oncology','tme','single-cell'], runHint: 'npm run dev', kind: 'primary' },
  { id: 'daraxonrasib',     name: 'daraxonrasib-platform', root: `${ROOT}/platform/components/daraxonrasib-platform`, baseUrl: null, healthPath: null, domains: ['oncology','kras','mevalonate'], runHint: 'npm run probe:all (CLI)', kind: 'primary' },
  { id: 'biocomposable',    name: 'Biocomposable',     root: `${ROOT}/platform/components/Biocomposable/Biocomposable-main`, baseUrl: process.env.BIOCOMPOSABLE_URL ?? 'http://localhost:3010', healthPath: '/api/health', domains: ['biocompute','pipeline','evidence'], runHint: 'npm run dev', kind: 'primary' },
  { id: 'tum',              name: 'Tum',               root: `${ROOT}/platform/components/Tum`,              baseUrl: process.env.TUM_URL ?? 'http://localhost:3011', healthPath: null, domains: ['biobank','datasets'], runHint: 'npm run dev', kind: 'primary' },
  // NOTE: 'use' (USE) removed 2026-10-06 — no such system exists in Uplift or BUSINESS (phantom registry entry).
  { id: 'metamap',          name: 'Meta-Map',          root: `${ROOT}/platform/components/Meta-Map`,         baseUrl: process.env.METAMAP_URL ?? 'http://localhost:3013', healthPath: '/api/health', domains: ['oncology','metastasis','hpc'], runHint: 'npm run dev', kind: 'primary' },
  { id: 'discourse',        name: 'Discourse Tool',    root: `${ROOT}/apps/Discourse Tool`,   baseUrl: process.env.DISCOURSE_URL ?? 'http://localhost:3030', healthPath: '/api/llama/status', domains: ['discourse','debate'], runHint: 'npm run dev (PORT honoured; default 3030)', kind: 'primary' },
  { id: 'umoe',             name: 'UMOE',              root: `${ROOT}/platform/components/UMOE`,   baseUrl: process.env.UMOE_URL ?? 'http://localhost:8010', healthPath: null, domains: ['oncology','mechanistic','ode'], runHint: 'uvicorn umoe.api:app', kind: 'new-tool' },
  { id: 'attec',            name: 'ATTEC designer',    root: `${ROOT}/platform/components/ATTEC designer`, baseUrl: process.env.ATTEC_URL ?? 'http://localhost:8011', healthPath: '/api/health', domains: ['chemlab','aatac','degrader'], runHint: 'npm run dev', kind: 'new-tool' },
  { id: 'biosim',           name: 'biosim_fusion',     root: `${ROOT}/apps/new-tools/biosim_fusion`, baseUrl: process.env.BIOSIM_URL ?? 'http://localhost:8012', healthPath: null, domains: ['quantum','folding'], runHint: 'uvicorn api.main:app', kind: 'new-tool' },
  { id: 'helixforge',       name: 'helixforge',        root: `${ROOT}/platform/components/helixforge-main`, baseUrl: process.env.HELIXFORGE_URL ?? 'http://localhost:8013', healthPath: null, domains: ['genomics','hypothesis'], runHint: 'pnpm -r run build', kind: 'new-tool' },
  { id: 'chemlab',          name: 'Overlay-Chemlab',   root: `${ROOT}/platform/components/Overlay-Chemlab`, baseUrl: process.env.CHEMLAB_URL ?? 'http://localhost:8014', healthPath: null, domains: ['chemlab','kinetics'], runHint: 'npm run dev', kind: 'new-tool' },
  { id: 'sciforge',         name: 'SciForge-Platform', root: `${ROOT}/platform/components/SciForge-Platform`, baseUrl: process.env.SCIFORGE_URL ?? 'http://localhost:8015', healthPath: null, domains: ['bus','events'], runHint: 'npm run dev', kind: 'new-tool' },
  { id: 'planetary',        name: 'Planetary-OS',      root: `${ROOT}/platform/components/Planetary-Intelligence-OS`, baseUrl: process.env.PLANETARY_URL ?? 'http://localhost:3015', healthPath: null, domains: ['planetary','viz'], runHint: 'npm run dev', kind: 'primary' },
  // OSS sidecars — Docker, fail-soft. Bring up via `docker compose -f docker-compose.orchestrator.yml up -d`
  { id: 'stirling-pdf',     name: 'Stirling-PDF',      root: `04_Integrations/integrations/Stirling-PDF`, baseUrl: process.env.STIRLING_PDF_URL ?? 'http://localhost:8080', healthPath: '/api/v1/info/status', domains: ['ingest','pdf','ocr'], runHint: 'docker compose -f docker-compose.orchestrator.yml up stirling-pdf', kind: 'new-tool' },
  { id: 'open-notebook',    name: 'open-notebook',     root: `04_Integrations/integrations/open-notebook`, baseUrl: process.env.OPEN_NOTEBOOK_URL ?? 'http://localhost:5055', healthPath: '/api/health', domains: ['notebook','synthesis','rag'], runHint: 'docker compose -f docker-compose.orchestrator.yml up open-notebook', kind: 'new-tool' },
  { id: 'scrapling',        name: 'Scrapling',         root: `04_Integrations/integrations/Scrapling`, baseUrl: process.env.SCRAPLING_URL ?? 'http://localhost:8001', healthPath: '/health', domains: ['scrape','ingest'], runHint: 'docker compose -f docker-compose.orchestrator.yml up scrapling', kind: 'new-tool' },
];

export function systemsForDomain(domain: string, explicit?: SystemId[]): FleetSystem[] {
  if (explicit?.length) return REGISTRY.filter(s => explicit.includes(s.id));
  const d = domain.toLowerCase();
  if (d === 'all' || d === '*') return REGISTRY;
  return REGISTRY.filter(s => s.domains.some(t => d.includes(t) || t.includes(d)));
}

export function getSystem(id: SystemId): FleetSystem | undefined {
  return REGISTRY.find(s => s.id === id);
}
