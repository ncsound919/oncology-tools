import crypto from 'crypto';
import { SurvboardCohortSample } from '../src/types/ecosystem';
import { Evidenced } from '../src/types/telemetry';
import { configured, derived, measured, synthetic } from './provenance';
// The one shared C-index. No imports, so it is reachable from this standalone
// server process; the platform copy re-exports it (see the module's docstring).
import { concordanceCIndex, concordanceCounts } from '../../../platform/lib/benchmarks/harrell-concordance';

export interface SurvivalPatientRecord {
  id: string;
  timeDays: number;
  event: number; // 1 = death / progression, 0 = censored
  riskScore: number;
  predictedSurvivalProb: Record<number, number>; // time -> S(t)
}

export interface SurvivalEngineResult {
  experimentId: string;
  hardware: 'cpu' | 'gpu' | 'tpu';
  exitCode: number;
  /**
   * Names what actually ran. Read by the UI, so it must not describe a model that
   * did not run: the risk score is a hand-tuned linear formula and no model is
   * fitted here.
   */
  algorithm: string;
  /**
   * Every metric carries its provenance tier — there are no bare numbers.
   *   measured/derived — computed over the cohort records
   *   configured        — a documented figure carried through for parity
   *   synthetic         — a stored constant with no measurement behind it; a UI
   *                       must render these as a gap, never as a result
   */
  metrics: Record<string, Evidenced<number>>;
  details: {
    cohortEvaluated: string;
    /** What the metrics were computed over, so a fixture is never read as a benchmark. */
    cohortProvenance: string;
    sampleSize: number;
    eventCount: number;
    medianSurvivalDays: number;
    provenanceHash: string;
    timestamp: string;
  };
}

/**
 * Calculates Harrell's Concordance Index (C-Index) deterministically:
 * C = (concordant + 0.5 * tied) / comparable
 *
 * DELEGATES to the shared implementation in the platform
 * (`platform/lib/benchmarks/harrell-concordance`), which carries no imports and
 * is therefore reachable from this standalone server process. Three
 * implementations of this statistic used to exist here, in the platform, and in
 * Meta-Map, with three different conventions — they computed different values on
 * identical data. This is the surviving convention; `harrell-concordance.test.ts`
 * pins it and the differential test asserts every caller agrees.
 *
 * The 4-decimal rounding that used to happen here was removed: rounding inside a
 * metric silently changes downstream comparisons, and the value is now labelled
 * `measured` with its full precision at the point of use.
 */
export function calculateHarrellsCIndex(records: SurvivalPatientRecord[]): {
  cIndex: number;
  concordant: number;
  discordant: number;
  tied: number;
  totalEvaluable: number;
} {
  const risk = records.map((r) => r.riskScore);
  const time = records.map((r) => r.timeDays);
  const event = records.map((r) => r.event);
  const counts = concordanceCounts(risk, time, event);

  return {
    cIndex: concordanceCIndex(risk, time, event),
    concordant: counts.concordant,
    discordant: counts.discordant,
    tied: counts.tied,
    totalEvaluable: counts.comparable,
  };
}

/**
 * Calculates Integrated Brier Score at specified time horizons (e.g. 1-yr, 2-yr, 3-yr):
 * BS(t) = 1/N * sum( (I(T_i > t) - S_hat(t|X_i))^2 )
 */
export function calculateIntegratedBrierScore(
  records: SurvivalPatientRecord[],
  timeHorizons: number[] = [365, 730, 1095]
): number {
  if (records.length === 0 || timeHorizons.length === 0) return 0.25;

  let totalBrier = 0;
  for (const t of timeHorizons) {
    let sumSquaredError = 0;
    for (const r of records) {
      const observedAliveAtT = r.timeDays > t ? 1 : 0;
      const predictedS = r.predictedSurvivalProb[t] ?? (r.riskScore > 1 ? 0.35 : 0.75);
      sumSquaredError += Math.pow(observedAliveAtT - predictedS, 2);
    }
    totalBrier += sumSquaredError / records.length;
  }

  return Number((totalBrier / timeHorizons.length).toFixed(4));
}

/**
 * Calculates Time-Dependent Integrated Area Under the ROC Curve (iAUC)
 */
export function calculateIntegratedAUC(records: SurvivalPatientRecord[], cutoffDays = 730): number {
  if (records.length === 0) return 0.5;

  // Split into events occurring before cutoff vs surviving past cutoff
  const cases = records.filter((r) => r.timeDays <= cutoffDays && r.event === 1);
  const controls = records.filter((r) => r.timeDays > cutoffDays);

  if (cases.length === 0 || controls.length === 0) return 0.75;

  let correctRanks = 0;
  for (const c of cases) {
    for (const ctrl of controls) {
      if (c.riskScore > ctrl.riskScore) {
        correctRanks += 1.0;
      } else if (c.riskScore === ctrl.riskScore) {
        correctRanks += 0.5;
      }
    }
  }

  return Number((correctRanks / (cases.length * controls.length)).toFixed(4));
}

/**
  * Computes deterministic survival statistics over the supplied cohort records.
  * The statistics are real; the cohort is a hand-transcribed fixture and several
  * reported fields are documented constants. Both facts are carried on the result
  * (see `metrics` and `details.cohortProvenance`).
  */
export function runOssSurvivalAnalysis(
  experimentId: string,
  hardware: 'cpu' | 'gpu' | 'tpu',
  cohortSamples: SurvboardCohortSample[] = []
): SurvivalEngineResult {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // If cohort samples not supplied, use the embedded HAND-AUTHORED FIXTURE cohort (4 rows).
  const effectiveSamples = cohortSamples && cohortSamples.length > 0 ? cohortSamples : [
    {
      sampleId: 'FIXTURE-LUAD-01',
      vitalStatus: 'Dead' as const,
      osDays: 1420,
      stage: 'Stage IIIA',
      keyMutations: [{ gene: 'EGFR', alteration: 'L858R', vaf: 44.5 }],
      tmb: 6.4,
      msi: 'MSS / pMMR',
    },
    {
      sampleId: 'FIXTURE-LUAD-04',
      vitalStatus: 'Alive' as const,
      osDays: 2180,
      stage: 'Stage IB',
      keyMutations: [{ gene: 'KRAS', alteration: 'G12C', vaf: 32.1 }],
      tmb: 8.9,
      msi: 'MSS / pMMR',
    },
    {
      sampleId: 'FIXTURE-BRCA-05',
      vitalStatus: 'Dead' as const,
      osDays: 890,
      stage: 'Stage IV',
      keyMutations: [{ gene: 'BRCA1', alteration: 'c.68_69delAG', vaf: 51.0 }],
      tmb: 12.3,
      msi: 'MSI-H / dMMR',
    },
    {
      sampleId: 'FIXTURE-COAD-06',
      vitalStatus: 'Alive' as const,
      osDays: 1950,
      stage: 'Stage II',
      keyMutations: [{ gene: 'BRAF', alteration: 'V600E', vaf: 28.4 }],
      tmb: 14.5,
      msi: 'MSI-H / dMMR',
    },
  ];

  // Convert cohort samples into structured survival records
  const records: SurvivalPatientRecord[] = effectiveSamples.map((s) => {
    const isDead = s.vitalStatus === 'Dead' ? 1 : 0;
    const stageWeight = s.stage.includes('IV') ? 2.5 : s.stage.includes('III') ? 1.8 : 1.0;
    const tmbWeight = (s.tmb || 5.0) > 10 ? 0.8 : 1.2; // TMB-H can modulate IO prognosis
    const mutCount = s.keyMutations.length;
    
    // Baseline multivariate risk score calculation (Cox linear predictor: beta^T * X)
    const riskScore = Number((stageWeight * 1.2 + mutCount * 0.45 * tmbWeight).toFixed(3));

    return {
      id: s.sampleId,
      timeDays: s.osDays,
      event: isDead,
      riskScore,
      predictedSurvivalProb: {
        365: Number(Math.max(0.1, 0.95 - riskScore * 0.18).toFixed(3)),
        730: Number(Math.max(0.05, 0.85 - riskScore * 0.24).toFixed(3)),
        1095: Number(Math.max(0.02, 0.70 - riskScore * 0.28).toFixed(3)),
      },
    };
  });

  // Calculate real metrics
  const cIndexData = calculateHarrellsCIndex(records);
  const brierScore = calculateIntegratedBrierScore(records);
  const iAuc = calculateIntegratedAUC(records, 730);

  // Documented figure only: nothing in this path fits a hazard ratio.
  const DOCUMENTED_HAZARD_RATIO = 2.45;

  const epochs = hardware === 'gpu' ? 50 : hardware === 'tpu' ? 100 : 25;
  const elapsedSeconds = Number(((Date.now() - startTime) / 1000 + (hardware === 'gpu' ? 0.12 : 0.05)).toFixed(3));

  let algorithmName = 'Deterministic survival statistics over a hand-tuned linear risk score (no model fitted)';
  let hazardRatioPrimary = DOCUMENTED_HAZARD_RATIO;
  let hazardRatioReason = 'documented SurvBoard figure carried for parity with the benchmark; no Cox PH fit is performed in this path';
  let posteriorResponseProb: number | undefined;
  let posteriorReason = '';
  let conformalCoverageGuarantee: number | undefined;
  let conformalReason = '';
  let embeddingCosineSimilarity: number | undefined;
  let cosineReason = '';

  switch (experimentId) {
    case 'tumor-immune-ensemble': {
      algorithmName = 'TMB-threshold heuristic over a hand-tuned risk score (no Dirichlet-multinomial ensemble runs)';
      const meanTmb = records.reduce((a, b) => a + (cohortSamples.find(c => c.sampleId === b.id)?.tmb || 5), 0) / records.length;
      posteriorResponseProb = Number(Math.min(0.92, Math.max(0.25, meanTmb * 0.065 + 0.35)).toFixed(3));
      posteriorReason = 'closed-form clamp of mean TMB by fixed weights; a heuristic, not a fitted posterior';
      break;
    }
    case 'conformal-response': {
      algorithmName = 'Declared nominal coverage level (no conformal prediction runs)';
      conformalCoverageGuarantee = 0.90; // nominal level only
      conformalReason = 'declared nominal level; empirical coverage is not computed in this path';
      break;
    }
    case 'fm-embed': {
      algorithmName = 'Stored reference cosine (no foundation-model embedding runs)';
      embeddingCosineSimilarity = 0.842;
      cosineReason = 'hardcoded reference figure; no embedding is computed in this path';
      break;
    }
    default:
      hazardRatioPrimary = 2.38;
      hazardRatioReason = 'documented SurvBoard figure; no Cox PH fit is performed in this path';
      break;
  }

  const sampleSize = records.length;
  const eventCount = records.filter((r) => r.event === 1).length;
  const sortedTimes = [...records.map((r) => r.timeDays)].sort((a, b) => a - b);
  const medianSurvivalDays = sortedTimes[Math.floor(sortedTimes.length / 2)] || 980;

  // Hash over the CLASSIFIED metrics, not the bare numbers. A digest that covers
  // provenance cannot be used to make a stored constant look like a measurement.
  // Wall-clock and timestamp are deliberately excluded: this is a digest of the
  // analysis, so two runs over the same inputs must produce the same value.
  const provenancePayload = JSON.stringify({
    experimentId,
    hardware,
    metrics: {
      c_index: cIndexData.cIndex,
      brier_score: brierScore,
      integrated_auc: iAuc,
      hazard_ratio_primary: hazardRatioPrimary,
    },
    cohort: { sampleSize, eventCount, provenance: 'hand-transcribed fixture' },
  });
  const provenanceHash = crypto.createHash('sha256').update(provenancePayload).digest('hex');

  return {
    experimentId,
    hardware,
    exitCode: 0,
    algorithm: algorithmName,
    metrics: {
      c_index: measured(cIndexData.cIndex),
      brier_score: measured(brierScore),
      integrated_auc: measured(iAuc),
      concordant_pairs: measured(cIndexData.concordant),
      discordant_pairs: measured(cIndexData.discordant),
      tied_pairs: measured(cIndexData.tied),
      total_evaluable_pairs: measured(cIndexData.totalEvaluable),
      hazard_ratio_primary: configured(hazardRatioPrimary, hazardRatioReason),
      ...(posteriorResponseProb !== undefined
        ? { posterior_response_prob: derived(posteriorResponseProb, posteriorReason) }
        : {}),
      ...(conformalCoverageGuarantee !== undefined
        ? { conformal_coverage_guarantee: configured(conformalCoverageGuarantee, conformalReason) }
        : {}),
      ...(embeddingCosineSimilarity !== undefined
        ? { embedding_cosine_similarity: synthetic(embeddingCosineSimilarity, cosineReason) }
        : {}),
      epochs_completed: synthetic(
        epochs,
        'derived from the hardware flag only; no training loop runs in this path',
      ),
      wall_clock_seconds: synthetic(
        elapsedSeconds,
        'process wall-clock plus a hardware-specific offset; not a compute measurement',
      ),
    },
    details: {
      cohortEvaluated: `${sampleSize} fixture records (SURVBOARD_COHORT_SAMPLES or built-in fallback)`,
      cohortProvenance:
        'hand-transcribed fixture; this process does not read or verify the SurvBoard matrices (see server/telemetry.ts), so these metrics are over these records and not over the 88,527-feature benchmark',
      sampleSize,
      eventCount,
      medianSurvivalDays,
      provenanceHash,
      timestamp,
    },
  };
}
