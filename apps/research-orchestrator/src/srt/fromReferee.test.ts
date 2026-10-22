import { describe, it, expect } from 'vitest';
import {
  ASSURANCE_SCHEMA,
  REFEREE_PRIMARY_METRIC,
  REQUIRED_GATES,
  fromReferee,
  gateRefereeArtifact,
  applyRefereeArtifact,
  type RefereeAssuranceArtifact,
  type RefereeGateName,
  type RefereeScoringReport,
} from './fromReferee';
import { createRegistry, preRegHash, type HypothesisRecord } from './registry';
import type { Criterion } from './analysis';

const CRITERION: Criterion = { metricName: REFEREE_PRIMARY_METRIC, comparator: '>=', threshold: 0.4 };

function report(over: Partial<RefereeScoringReport> = {}): RefereeScoringReport {
  return {
    packId: 'rano-2.0',
    criterionName: 'RANO 2.0',
    manifestHash: 'b'.repeat(64),
    nCasesLocked: 40,
    nCasesScored: 40,
    primary: {
      sutA: 'engine', sutB: 'reader', nUnits: 40,
      weightedKappa: 0.61, unweightedKappa: 0.55,
      kappaCi: { lower: 0.4, upper: 0.78 },
    },
    negativeControl: { sutId: 'shuffled', weightedKappa: 0.04, unweightedKappa: 0.03, margin: 0.57 },
    gatesCleared: [...REQUIRED_GATES],
    limitations: ['reproducibility, not clinical correctness'],
    ...over,
  };
}

function artifact(over: Partial<RefereeAssuranceArtifact> = {}): RefereeAssuranceArtifact {
  return {
    schema: ASSURANCE_SCHEMA,
    generatedAt: '2026-10-13T00:00:00Z',
    subject: { id: 'engine', kind: 'deterministic_engine' },
    outcome: { status: 'scored', report: report() },
    integrity: { algorithm: 'sha256', outcomeHash: 'a'.repeat(64), subjectHash: 'c'.repeat(64) },
    anchor: { status: 'anchored', tsa: 'https://freetsa.org/tsr', genTime: '2026-10-13T00:00:00Z', tokenPath: '/tmp/x.tsr' },
    ...over,
  };
}

describe('gateRefereeArtifact', () => {
  it('accepts a clean, anchored, control-near-chance scorecard', () => {
    const g = gateRefereeArtifact(artifact());
    expect(g.eligible).toBe(true);
    expect(g.reasons).toEqual([]);
    expect(g.metric).toBe(0.61);
    expect(g.provenance.anchorStatus).toBe('anchored');
  });

  it('rejects a refusal and says a refusal is not a falsification', () => {
    const g = gateRefereeArtifact(artifact({
      outcome: { status: 'refused', failure: { gate: 'negative-control', reason: 'control above ceiling', details: [] } },
    }));
    expect(g.eligible).toBe(false);
    expect(g.reasons.join(' ')).toMatch(/INCONCLUSIVE, never falsified/);
  });

  it('rejects an uncleared required gate and names it', () => {
    const cleared = REQUIRED_GATES.filter((x) => x !== 'sut-coverage');
    const g = gateRefereeArtifact(artifact({ outcome: { status: 'scored', report: report({ gatesCleared: cleared as RefereeGateName[] }) } }));
    expect(g.eligible).toBe(false);
    expect(g.reasons.join(' ')).toMatch(/uncleared required gate\(s\): sut-coverage/);
  });

  it('rejects a control that is not near chance — the falsification gate', () => {
    const g = gateRefereeArtifact(artifact({
      outcome: { status: 'scored', report: report({ negativeControl: { sutId: 'shuffled', weightedKappa: 0.55 } }) },
    }));
    expect(g.eligible).toBe(false);
    expect(g.reasons.join(' ')).toMatch(/near-chance ceiling/);
  });

  it('rejects an unanchored artifact by default, and accepts it on request', () => {
    const a = artifact({ anchor: { status: 'not-requested' } });
    expect(gateRefereeArtifact(a).eligible).toBe(false);
    expect(gateRefereeArtifact(a).reasons.join(' ')).toMatch(/not 'anchored'/);
    expect(gateRefereeArtifact(a, { requireAnchor: false }).eligible).toBe(true);
  });

  it('rejects a wrong schema and a missing artifact without throwing', () => {
    expect(gateRefereeArtifact(artifact({ schema: 'other/1' })).reasons.join(' ')).toMatch(/wrong schema/);
    expect(gateRefereeArtifact(null).eligible).toBe(false);
    expect(gateRefereeArtifact(undefined).reasons.join(' ')).toMatch(/no artifact supplied/);
  });

  it('rejects a non-finite kappa', () => {
    const g = gateRefereeArtifact(artifact({
      outcome: { status: 'scored', report: report({ primary: { sutA: 'a', sutB: 'b', nUnits: 10, weightedKappa: Number.NaN } }) },
    }));
    expect(g.eligible).toBe(false);
    expect(g.reasons.join(' ')).toMatch(/not finite/);
  });
});

describe('fromReferee', () => {
  it('maps an eligible scorecard to an ok RunResult carrying the kappa and its CI', () => {
    const { result, gate } = fromReferee(artifact());
    expect(result.ok).toBe(true);
    expect(result.metricName).toBe(REFEREE_PRIMARY_METRIC);
    expect(result.metric).toBe(0.61);
    expect(result.ciLo).toBe(0.4);
    expect(result.ciHi).toBe(0.78);
    expect(result.n).toBe(40);
    expect(result.runId).toMatch(/^referee:/);
    expect(gate.eligible).toBe(true);
  });

  it('maps an ineligible artifact to ok:false so the verdict is inconclusive, not falsified', () => {
    const ineligible = fromReferee(artifact({ anchor: { status: 'refused', error: 'tsa down' } }));
    expect(ineligible.result.ok).toBe(false);
  });
});

describe('applyRefereeArtifact (closes cadence P7)', () => {
  function testingHypothesis(): { doc: ReturnType<typeof createRegistry>; id: string } {
    const spec = {
      title: 'RANO agreement exceeds 0.4', mechanism: 'm', dataPlan: 'd',
      analysisPlan: 'a', holdout: 'h', primaryOutcome: 'weighted_kappa',
      successCriterion: '>= 0.4', falsifier: 'kappa <= 0.4',
    };
    const base: HypothesisRecord = {
      id: 'hyp-1', title: spec.title, mechanism: 'm', status: 'testing',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      calibratedConfidence: 0.5, evidenceTier: 2,
      preregistration: { ...spec, hash: preRegHash(spec), enteredAt: '2026-01-01T00:00:00Z' },
      outcomes: [],
    };
    return { doc: { version: 1, hypotheses: [base] }, id: 'hyp-1' };
  }

  it('records a supported verdict, raises confidence, and moves the status', () => {
    const { doc, id } = testingHypothesis();
    const applied = applyRefereeArtifact(doc, id, artifact(), CRITERION, { now: '2026-02-01T00:00:00Z' });
    expect(applied.verdict.verdict).toBe('supported');
    expect(applied.hypothesis.status).toBe('supported');
    expect(applied.confidenceAfter).toBeGreaterThan(applied.confidenceBefore);
    expect(applied.gate.reasons).toEqual([]);
  });

  it('records inconclusive (never falsified) for an ineligible artifact, and says why', () => {
    const { doc, id } = testingHypothesis();
    const applied = applyRefereeArtifact(
      doc, id,
      artifact({ outcome: { status: 'scored', report: report({ negativeControl: { sutId: 'shuffled', weightedKappa: 0.6 } }) } }),
      CRITERION, { now: '2026-02-01T00:00:00Z' },
    );
    expect(applied.verdict.verdict).toBe('inconclusive');
    const last = applied.hypothesis.outcomes[applied.hypothesis.outcomes.length - 1];
    // The reason must survive into the ledger, or it records a number with no why.
    expect(last.detail).toMatch(/not eligible/);
    expect(last.detail).toMatch(/near-chance ceiling/);
  });

  it('records a falsified verdict when the metric genuinely misses the criterion', () => {
    const { doc, id } = testingHypothesis();
    const applied = applyRefereeArtifact(
      doc, id,
      artifact({ outcome: { status: 'scored', report: report({ primary: { sutA: 'e', sutB: 'r', nUnits: 40, weightedKappa: 0.1, kappaCi: { lower: 0.02, upper: 0.18 } } }) } }),
      CRITERION, { now: '2026-02-01T00:00:00Z' },
    );
    expect(applied.verdict.verdict).toBe('falsified');
    expect(applied.hypothesis.status).toBe('falsified');
  });
});
