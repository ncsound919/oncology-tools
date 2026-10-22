/**
 * End-to-end verification: boot the real server, exercise every new endpoint,
 * assert the defect fixes hold against live upstreams, then exit.
 *
 * Run: node verify.mjs
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = Number(process.env.VERIFY_PORT) || 3123;
const BASE = `http://127.0.0.1:${PORT}`;
const results = [];
let failures = 0;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
}

const child = spawn('npx', ['tsx', 'server.ts'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(PORT), GEMINI_API_KEY: '' },
  shell: true,
});

let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d.toString()));
child.stderr.on('data', (d) => (serverLog += d.toString()));

async function waitForHealth(timeoutMs = 40000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(700);
  }
  return false;
}

async function get(path, timeoutMs = 50000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}${path}`, { signal: c.signal });
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

async function post(path, payload, timeoutMs = 90000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: c.signal,
    });
    const body = await r.json().catch(() => ({}));
    return { status: r.status, body };
  } finally {
    clearTimeout(t);
  }
}

const sclcCase = {
  id: 'verify-sclc',
  patientRef: 'VERIFY-SCLC',
  age: 64,
  sex: 'Male',
  cancerType: 'Small Cell Lung Cancer',
  histology: 'Small cell carcinoma',
  stage: 'Stage IVB',
  ecogScore: 1,
  lineOfTherapy: '1st Line (Treatment Naive)',
  smokingStatus: 'Former',
  priorTherapies: [],
  genomicAlterations: [
    { id: 'a1', gene: 'EGFR', hgvsProtein: 'p.L858R', variantType: 'Missense', vafPercent: 41, tier: 'Tier I' },
    { id: 'a2', gene: 'TP53', hgvsProtein: 'p.R273H', variantType: 'Missense', vafPercent: 55, tier: 'Tier II' },
  ],
  biomarkers: { msiStatus: 'MSS / pMMR', tmbMutMb: 6 },
  labs: { eGfr: 88, totalBilirubin: 0.7, ast: 22, alt: 28, qtcIntervalMs: 405 },
};

try {
  const up = await waitForHealth();
  record('server boots and /api/health responds', up, up ? '' : serverLog.slice(-600));
  if (!up) throw new Error('server did not start');

  // ── OncoTree: the substring-matching fix ────────────────────────────────────
  const ot = await get(`/api/external/oncotree?q=${encodeURIComponent('Small Cell Lung Cancer')}`);
  record(
    'OncoTree resolves SCLC to code SCLC (not NSCLC)',
    ot.body?.resolution?.code === 'SCLC',
    `code=${ot.body?.resolution?.code} source=${ot.body?.resolution?.source}`
  );

  const otN = await get(`/api/external/oncotree?q=${encodeURIComponent('Non-Small Cell Lung Cancer')}`);
  record('OncoTree resolves NSCLC to code NSCLC', otN.body?.resolution?.code === 'NSCLC', `code=${otN.body?.resolution?.code}`);

  // ── CIViC live ──────────────────────────────────────────────────────────────
  const civ = await get('/api/external/civic/evidence?gene=EGFR&alteration=p.L858R');
  record(
    'CIViC live evidence for EGFR L858R',
    civ.body?.available === true && civ.body?.evidenceCount > 0,
    `available=${civ.body?.available} count=${civ.body?.evidenceCount} best=${civ.body?.bestLevel} reason=${civ.body?.reason ?? ''}`
  );

  // ── VEP live ────────────────────────────────────────────────────────────────
  // rest.ensembl.org is genuinely flaky, so the invariant is not "VEP is up".
  // It is: VEP either returns a real annotation, or degrades to an explicit
  // available:false with a non-empty reason. It never fabricates a consequence.
  const vep = await get('/api/external/vep?gene=EGFR&alteration=p.L858R');
  const vepUp = vep.body?.available === true && !!vep.body?.canonical;
  const vepDegraded = vep.body?.available === false && typeof vep.body?.reason === 'string' && vep.body.reason.length > 0;
  record(
    'VEP either annotates OR degrades honestly (never fabricates)',
    vepUp || vepDegraded,
    vepUp
      ? `annotated: ${vep.body?.mostSevereConsequence}`
      : `degraded: ${vep.body?.reason}`
  );

  // ── Open Targets live ───────────────────────────────────────────────────────
  const otg = await get('/api/external/opentargets/target?gene=EGFR');
  record(
    'Open Targets returns druggable candidates for EGFR',
    otg.body?.available === true && otg.body?.drugCount > 0,
    `available=${otg.body?.available} drugs=${otg.body?.drugCount} reason=${otg.body?.reason ?? ''}`
  );

  // ── ChEMBL live ─────────────────────────────────────────────────────────────
  const chem = await get('/api/external/chembl/drug?name=Osimertinib');
  record(
    'ChEMBL resolves Osimertinib with mechanism',
    chem.body?.resolved === true && chem.body?.chemblId === 'CHEMBL3353410',
    `chemblId=${chem.body?.chemblId} moa=${(chem.body?.mechanisms || []).join('/')} reason=${chem.body?.reason ?? ''}`
  );

  // ── Server-side trial match ─────────────────────────────────────────────────
  const tm = await post('/api/onco-agent/trials/match', { patientCase: sclcCase, pageSize: 10 });
  const tmOk = tm.body?.result?.available === true && tm.body?.result?.totalRegistryHits > 0;
  record(
    'Server-side biomarker trial match returns ranked protocols',
    tmOk,
    `hits=${tm.body?.result?.totalRegistryHits} considered=${tm.body?.result?.considered} top=${tm.body?.result?.trials?.[0]?.nctId} score=${tm.body?.result?.trials?.[0]?.score}`
  );

  // ── Analyze: the SCLC regimen fix, with live enrichment ─────────────────────
  const an = await post('/api/onco-agent/analyze', { patientCase: sclcCase });
  const report = an.body?.report;
  const names = (report?.recommendedRegimens || []).map((r) => r.name.toLowerCase()).join(' | ');
  record(
    'SCLC report does NOT recommend an EGFR-TKI',
    // Non-vacuous: the report must exist AND carry regimens. An empty list would
    // otherwise satisfy "contains no osimertinib" trivially.
    !!report && (report.recommendedRegimens || []).length > 0 && !/osimertinib|amivantamab|lazertinib/.test(names),
    `report=${!!report} n=${(report?.recommendedRegimens || []).length} regimens: ${names || '(none)'}`
  );
  record(
    'report carries a genomicKnowledge section with live sources',
    report?.genomicKnowledge?.available === true,
    `available=${report?.genomicKnowledge?.available} sources=${(report?.genomicKnowledge?.sources || []).filter((s) => s.available).length}ok/${(report?.genomicKnowledge?.sources || []).length}`
  );
  record(
    'report resolves identity via OncoTree (code surfaced)',
    report?.genomicKnowledge?.cancerType?.code === 'SCLC',
    `code=${report?.genomicKnowledge?.cancerType?.code} source=${report?.genomicKnowledge?.cancerType?.source}`
  );
  record(
    'report actionability never presents the operator tier as a verified classification',
    !!report &&
      (report.molecularDrivers || []).length > 0 &&
      !/tier i \(fda approved|verified under amp/i.test(JSON.stringify(report.molecularDrivers)),
    (report?.molecularDrivers || []).map((d) => d.actionabilityLevel).join(' || ').slice(0, 220)
  );

  // ── Orchestrate: guardrail + telemetry integration ──────────────────────────
  const orch = await post('/api/onco-agent/orchestrate', { patientCase: sclcCase });
  const checks = orch.body?.result?.guardrailChecks || [];
  const gr02 = checks.find((c) => c.id === 'GR-02-EGFR-IO-MONOTHERAPY');
  record(
    'GR-02 does not fire for SCLC (was firing pre-fix)',
    gr02 ? gr02.triggered === false : false,
    `gr02=${gr02 ? gr02.triggered : 'missing'} totalChecks=${checks.length}`
  );
  record(
    'data-driven guardrails GR-08..GR-10 present',
    checks.some((c) => c.id === 'GR-08-CHEMBL-BOXED-WARNING') &&
      checks.some((c) => c.id === 'GR-09-CHEMBL-CYP-SUBSTRATE-OVERLAP') &&
      checks.some((c) => c.id === 'GR-10-OPENTARGETS-TARGET-SAFETY'),
    checks.map((c) => c.id).join(',')
  );
  record(
    'orchestration status is valid and confidence bounded',
    ['COMPLETED_CLEAN', 'COMPLETED_WITH_WARNINGS', 'FLAGGED_BLOCKED'].includes(orch.body?.result?.pipelineStatus) &&
      orch.body?.result?.overallConsensusConfidence >= 0 &&
      orch.body?.result?.overallConsensusConfidence <= 100,
    `status=${orch.body?.result?.pipelineStatus} conf=${orch.body?.result?.overallConsensusConfidence}`
  );

  // ── Telemetry: the fabrication fixes ────────────────────────────────────────
  const tel = await get('/api/ecosystem/telemetry');
  const snap = tel.body?.snapshot;
  record('telemetry snapshot returns', !!snap, '');
  record(
    'telemetry has no rfc3161Timestamp field',
    snap?.provenanceAudit ? !('rfc3161Timestamp' in snap.provenanceAudit) : false,
    Object.keys(snap?.provenanceAudit || {}).join(',')
  );
  record(
    'telemetry trusted timestamp is explicitly null/unmeasured',
    snap?.provenanceAudit?.trustedTimestampToken?.value === null &&
      snap?.provenanceAudit?.trustedTimestampToken?.evidence === 'unmeasured',
    `${snap?.provenanceAudit?.trustedTimestampToken?.evidence}`
  );
  record(
    'claim-lint reports not-implemented, never allClaimsVerified:true',
    snap?.provenanceAudit?.claimLintStatus?.status === 'not-implemented' &&
      snap?.provenanceAudit?.claimLintStatus?.allClaimsVerified?.value === null,
    `status=${snap?.provenanceAudit?.claimLintStatus?.status} verified=${snap?.provenanceAudit?.claimLintStatus?.allClaimsVerified?.value}`
  );
  record(
    'no multi-modal field claims to be "measured" (attachment is not completeness)',
    snap?.multiModalDimensions
      ? snap.multiModalDimensions.totalFeatures?.evidence !== 'measured' &&
        snap.multiModalDimensions.completeModalitiesAvailable?.evidence !== 'measured' &&
        snap.multiModalDimensions.activeCohortPatients?.evidence !== 'measured' &&
        (snap.multiModalDimensions.modalities || []).every((m) => m.featureCount?.evidence !== 'measured')
      : false,
    `totalFeatures=${snap?.multiModalDimensions?.totalFeatures?.evidence} complete=${snap?.multiModalDimensions?.completeModalitiesAvailable?.evidence}`
  );
  record(
    'Kaggle quota is not the fabricated 5.5h init and has no structurally-zero reserved field',
    snap?.computeQuota?.settledHours?.value === 0 && snap?.computeQuota?.reservedHours === undefined,
    `settled=${snap?.computeQuota?.settledHours?.value} reservedFieldPresent=${snap?.computeQuota?.reservedHours !== undefined}`
  );
  record(
    'observability counted the orchestrate run (metric bites)',
    (snap?.pipelineObservability?.totalDeliberations?.value ?? 0) > 0,
    `deliberations=${snap?.pipelineObservability?.totalDeliberations?.value} localFallback=${snap?.pipelineObservability?.localFallbackRuns}`
  );
  record(
    'quota allocation is labelled "configured", not "measured"',
    snap?.computeQuota?.weeklyAllocatedHours?.evidence === 'configured',
    `${snap?.computeQuota?.weeklyAllocatedHours?.evidence}`
  );
} catch (err) {
  record('verification run completed', false, err instanceof Error ? err.message : String(err));
} finally {
  // Kill the whole tree. `shell: true` means child.pid is the shell, so killing
  // it alone leaves the node grandchild holding the port.
  try {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } catch {
    /* best effort */
  }
  await sleep(600);
  try {
    child.kill('SIGKILL');
  } catch {
    /* already gone */
  }
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n==== ${passed}/${results.length} checks passed, ${failures} failed ====`);
if (failures > 0) {
  console.log('\n--- server log tail ---');
  console.log(serverLog.slice(-3000));
}
process.exit(failures > 0 ? 1 : 0);