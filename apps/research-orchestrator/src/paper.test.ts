import { describe, it, expect } from 'vitest';
import { buildPaper, buildLaymanPaper } from './reporter.js';
import { verifyClaims } from './claims.js';
import type { Contribution, EvidenceRef, PayloadRef, ResearchDirective } from './types.js';

const directive: ResearchDirective = {
  objective: 'Establish whether EGFR T790M knockout delays resistance escape',
  questions: [],
  direction: 'mechanism-mapping',
};

const study = { id: 'study_paper_t', title: 'T790M knockout study', domain: 'oncology', query: 'T790M', directive };

const contributions: Contribution[] = [
  { systemId: 'oncoforesight', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'oncograph', kind: 'data', title: 'payload', detail: 'x' },
  { systemId: 'overlay-oncology', kind: 'literature', title: 'papers', detail: 'x', papers: [{ id: 'PMC1', title: 'Resistance in EGFR-mutant NSCLC', source: 'PubMed', published: '2025', url: 'https://x/1' }] },
];

const payloadRefs: PayloadRef[] = [
  { systemId: 'simulation-oncoforesight', sha256: 'a'.repeat(64), file: 'payloads/study_paper_t/simulation-oncoforesight.json' },
  { systemId: 'simulation-oncograph', sha256: 'b'.repeat(64), file: 'payloads/study_paper_t/simulation-oncograph.json' },
];

function claim(text: string, refs: EvidenceRef[], classHint: 'computed' | 'narrated' | 'literature') {
  return verifyClaims([{
    text, kind: 'finding', evidenceRefs: refs, evidenceDepth: 'derived',
    confidence: 0.9, evidenceClass: classHint,
    stage: 'simulation', systemId: refs[0]!.type === 'system-output' ? (refs[0]!.id as any) : undefined,
  }], contributions, 'study_paper_t')[0]!;
}

describe('paper assembly', () => {
  const claims = [
    claim('OncoForesight counterfactual simulation: P(response) 61% — computed by calibrated predictors.', [{ type: 'system-output', id: 'oncoforesight' }], 'computed'),
    claim('Overlay Oncology literature base retrieved 1 paper on EGFR resistance.', [{ type: 'paper', id: 'PMC1' }], 'literature'),
    claim('Oncograph returned an LLM-GENERATED narrative — model opinion, NOT a mechanistic simulation result.', [{ type: 'system-output', id: 'oncograph' }], 'narrated'),
  ];
  const paper = buildPaper({ study, contributions, claims, payloadRefs, finishedAt: '2026-08-31T00:00:00Z' });

  it('separates computed results from narrated model opinion', () => {
    expect(paper).toContain('## 1. Computed simulation results');
    expect(paper).toContain('## 3. Model-generated material (NOT computed results)');
    expect(paper).toContain('model opinion, NOT a mechanistic simulation result');
  });

  it('cites every claim id and payload hash', () => {
    expect(paper).toContain('c_study_paper_t_0');
    expect(paper).toContain('a'.repeat(12));
    expect(paper).toContain('simulation-oncoforesight.json');
  });

  it('includes the provenance table and integrity command', () => {
    expect(paper).toContain('## 6. Methods & provenance');
    expect(paper).toContain('GET /api/runs/study_paper_t?verify=1');
    expect(paper).toContain('| `c_study_paper_t_0` | computed | simulation | oncoforesight |');
  });
});

describe('layman paper assembly', () => {
  const claims = [
    claim('OncoForesight counterfactual arm-switch simulation (arm "Arm B"): P(response) 61.2%, 6-month resistance risk 23.0% — computed by its calibrated remission/resistance/toxicity predictors for a patient in its trial database.', [{ type: 'system-output', id: 'oncoforesight' }], 'computed'),
    claim('Overlay Oncology multiscale TME simulation (PK/PD ODE + reaction-diffusion PDE + agent-based contact mechanics): ic50 0.8 µM, seed 42; 60 history points over 60 simulated hours; live-cell reduction 60.0%.', [{ type: 'system-output', id: 'overlay-oncology' }], 'computed'),
    claim('Overlay Oncology literature base retrieved 1 paper on EGFR resistance.', [{ type: 'paper', id: 'PMC1' }], 'literature'),
    claim('Oncograph returned an LLM-GENERATED narrative "knockout simulation" report (~1200 chars, Gemini). This is model opinion about clonal dynamics/resistance escape, NOT a mechanistic simulation result — treat as hypothesis material only.', [{ type: 'system-output', id: 'oncograph' }], 'narrated'),
    claim('No longitudinal resistance data was available for this patient cohort.', [{ type: 'system-output', id: 'oncoforesight' }], 'computed'),
    claim('Unverifiable statement citing a paper the run never retrieved.', [{ type: 'paper', id: 'PMC404' }], 'literature'),
  ].map((c, i) => ({ ...c, kind: i === 4 ? 'gap' as const : c.kind }));
  const layman = buildLaymanPaper({
    study,
    contributions,
    claims,
    payloadRefs,
    finishedAt: '2026-08-31T00:00:00Z',
    dispatchProblems: [
      { systemId: 'chemlab', reason: 'the study did not supply required inputs (temperature, totalTime)' },
      { systemId: 'umoe', reason: 'the system did not respond' },
    ],
  });

  it('explains the question, the pipeline, and what each system is', () => {
    expect(layman).toContain('## What did we want to find out?');
    expect(layman).toContain('Establish whether EGFR T790M knockout delays resistance escape');
    expect(layman).toContain('## How did we study it?');
    expect(layman).toContain('**oncoforesight** is a treatment-outcome forecaster');
    expect(layman).toContain('**overlay-oncology** is a physics-and-chemistry cancer simulator');
    expect(layman).toContain('digital petri dish');
  });

  it('reports experimental numbers verbatim with confidence framing', () => {
    expect(layman).toContain('## What did the experiments show?');
    expect(layman).toContain('61.2%');
    expect(layman).toContain('Confidence: high');
  });

  it('separates published science, AI guesswork, and unknowns', () => {
    expect(layman).toContain('## What does the published science say?');
    expect(layman).toContain('Resistance in EGFR-mutant NSCLC');
    expect(layman).toContain('## What is educated guesswork (not a result)?');
    expect(layman).toContain('LLM-GENERATED');
    expect(layman).toContain('## What we still don\u2019t know');
    expect(layman).toContain('longitudinal resistance data');
  });

  it('names systems that could not run and why, in plain language', () => {
    expect(layman).toContain('Systems that could not run this time');
    expect(layman).toContain('**chemlab** — the study did not supply required inputs (temperature, totalTime)');
    expect(layman).toContain('**umoe** — the system did not respond');
  });

  it('ends with a short version and a real integrity check', () => {
    expect(layman).toContain('## The short version');
    expect(layman).toContain('GET /api/runs/study_paper_t?verify=1');
    expect(layman).toContain('2 archived payloads');
    expect(layman).toContain('5 verified claims');
    expect(layman).toContain('quarantined for failed evidence checks');
    expect(layman).toContain('kept out of the results');
  });
});
