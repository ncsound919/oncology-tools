import { describe, it, expect } from 'vitest';
import {
  extractSummaryAndTakeaways,
  generateTranscriptMarkdown,
  generateTranscriptPlainText,
  generateTranscriptJSON,
} from '../transcriptExport';
import { DebateSession, DebateRound, AgentPersona, JudgeSynthesis } from '../../types';

describe('transcriptExport Utility Suite', () => {
  const mockAgent: AgentPersona = {
    id: 'agent-1',
    name: 'Dr. Elena Rostova',
    role: 'Computational Oncologist',
    avatar: '🧬',
    bio: 'Pioneer in single-cell chromatin accessibility and stochastic modeling.',
    stanceBrief: 'Pro-hierarchical stem cell model',
    initialPosition: 0.85,
    initialConfidence: 92,
    reasoningStyle: 'Dynamical Systems',
    primaryLens: 'scientific',
    secondaryLens: 'mathematical',
    formalDiscipline: 'Systems Oncology',
    conflictingObjective: 'Maximize biomarker sensitivity in single-cell assays',
    failureModeGuarded: 'Selection bias in FACS sorting',
  };

  const mockRound: DebateRound = {
    roundIndex: 0,
    name: 'Round 1: Mechanistic Hypotheses',
    description: 'Establish baseline mathematical and biological claim cards',
    statements: [
      {
        agentId: 'agent-1',
        agentName: 'Dr. Elena Rostova',
        role: 'Computational Oncologist',
        avatar: '🧬',
        roundIndex: 0,
        statementText: 'Single-cell ATAC-seq demonstrates strict epigenetic commitment barriers.',
        updatedPosition: 0.88,
        updatedConfidence: 95,
        reasonForUpdate: 'Empirical single-cell data supports strict barriers',
        timing: {
          timestamp: 'T+00:30',
          elapsedSessionSeconds: 30,
          allocatedSeconds: 45,
          durationSeconds: 30,
          timeStatus: 'within_window',
          speakingPaceWpm: 145,
        },
        evaluatedClaim: {
          id: 'claim-1',
          claim: 'ATAC-seq peaks confirm non-reversible lineage commitment',
          claimType: 'Causal / Mechanistic',
          evidence: [],
          counterevidence: [],
          alternativeExplanations: [],
          testablePrediction: 'Oct4 locus accessibility drops 10-fold within 48h of differentiation',
          falsifier: 'Observation of active transcription factors at Oct4 locus during late differentiation',
          confidence: 0.9,
          confidenceRationale: 'Calibrated using 500k single-cell sequencing profiles',
          evidenceTier: 1,
          status: 'supported',
          numericalFidelity: {
            sampleSize: '500,000 cells',
          },
        },
        mathematicalGrounding: 'dx/dt = -grad V(x)',
      },
    ],
  };

  const mockJudge: JudgeSynthesis = {
    evaluationText: 'Debate demonstrated strong convergence toward state-transition dynamics under stress.',
    winner: 'Dr. Elena Rostova',
    quadLensScores: {
      scientific: 92,
      mathematical: 88,
      philosophical: 85,
      moral: 90,
    },
    quadLensBreakdown: {
      scientificAnalysis: 'Rigorous empirical citations of scATAC-seq datasets',
      mathematicalAnalysis: 'Markov state-transition ODE models validated',
      philosophicalAnalysis: 'Process ontology harmonized with essentialist markers',
      moralAnalysis: 'Trial ethics prioritized patient risk reduction',
    },
    interconnectedChainAnalysis: 'Sequential mapping from single-cell profiling to trial design',
    candidateHypotheses: [
      {
        rank: 1,
        id: 'hyp-1',
        title: 'Reversible Epigenetic Plasticity Model',
        mechanism: 'Stochastic switching across shallow Waddington energy wells driven by hypoxia',
        claimCards: [],
        calibratedConfidence: 0.89,
        highestEvidenceTier: 1,
        noveltyScore: 85,
        priorArtComparison: 'Extends classic Waddington landscape with dynamic transition rates',
        falsificationProtocol: {
          hypothesisId: 'hyp-1',
          hypothesisTitle: 'Reversible Epigenetic Plasticity Model',
          targetMechanism: 'HIF2A-driven dedifferentiation',
          proposedPerturbation: 'Small-molecule HIF2A inhibition',
          biologicalModelSystem: 'PDX organoids',
          positiveControl: 'Knockdown construct',
          negativeControl: 'Scrambled vector',
          vehicleOrScrambledControl: 'DMSO control',
          powerAnalysis: {
            statisticalPower: 0.9,
            alpha: 0.05,
            effectSizeEstimate: '0.45 HR reduction',
            requiredSampleSize: '120 mice',
          },
          primaryEndpoints: ['PFS'],
          secondaryEndpoints: ['OS'],
          leakageAndConfounderChecks: ['Batch effect correction'],
          prespecifiedFalsificationThreshold: 'p > 0.05',
          timelineAndFeasibility: '18 months',
        },
      },
    ],
    claimAuditTrail: [],
    minorityReports: [
      {
        role: 'Adversarial Critic',
        agentName: 'Dr. Marcus Vance',
        dissentingClaim: 'Stemness is purely deterministic',
        evidenceBasis: 'Reversibility is an artifact of in vitro culture',
        unresolvedGap: 'In vivo lineage tracing with barcoding',
      },
    ],
    preregisteredProtocols: [
      {
        hypothesisId: 'hyp-1',
        hypothesisTitle: 'In Vivo Single-Cell Barcoding Trial',
        targetMechanism: 'Lineage tracing under therapy stress',
        proposedPerturbation: 'Carboplatin challenge',
        biologicalModelSystem: 'Patient-Derived Xenograft (PDX) Organoid',
        positiveControl: 'Known resistant line',
        negativeControl: 'Wildtype control',
        vehicleOrScrambledControl: 'Vehicle control',
        powerAnalysis: {
          statisticalPower: 0.9,
          alpha: 0.05,
          effectSizeEstimate: '0.45 hazard ratio reduction',
          requiredSampleSize: '120 mice per arm',
        },
        primaryEndpoints: ['PFS'],
        secondaryEndpoints: ['OS'],
        leakageAndConfounderChecks: ['Host immune background controls'],
        prespecifiedFalsificationThreshold: 'p > 0.05 on log-rank test for progression-free survival',
        timelineAndFeasibility: '12 months',
      },
    ],
    noveltyVerdict: 'High translational relevance with novel quantitative threshold parameters',
    methodologicalAudit: {
      statisticalPowerSummary: 'Adequate sample size in scRNA-seq cohort',
      leakageAndBiasRisks: ['Batch effects across clinical trial sites'],
      controlSufficiency: 'Rigorous positive and negative controls',
    },
    keyArguments: [
      {
        point: 'Dynamic plastic switching dominates under chemotherapy pressure',
        strength: 9,
        contributor: 'Dr. Elena Rostova',
        lens: 'scientific',
      },
    ],
    dissent: 'Unresolved debate on whether in vitro organoids recapitulate stromal cues.',
    openQuestions: ['What is the exact kinetic rate of dedifferentiation in vivo?'],
    consensusScore: 84,
  };

  const mockSession: Partial<DebateSession> = {
    id: 'session-test-1',
    topic: 'Cancer Stem Cells vs Dynamic Plasticity',
    format: 'roundtable',
    timestamp: '2026-08-20T19:00:00Z',
    totalElapsedSeconds: 180,
    status: 'completed',
    agents: [mockAgent],
    rounds: [mockRound],
    judgeResult: mockJudge,
    researchBrief: {
      question: 'Is stemness an intrinsic cellular identity or a plastic state?',
      population_or_system: 'Human Triple-Negative Breast Cancer PDX models',
      primary_outcome: 'Relapse latency following carboplatin challenge',
      candidate_mechanism: 'Hypoxia-induced HIF2A-driven EMT transcription factor loop',
      allowed_evidence: ['In vivo lineage tracing', 'single-cell multi-omics'],
      excluded_evidence: ['Bulk cell culture passaging beyond 10 generations'],
      success_criterion: 'Statistically significant shift in tumor-initiating cell frequency',
    },
  };

  it('extractSummaryAndTakeaways extracts structured parameters correctly', () => {
    const summary = extractSummaryAndTakeaways(mockSession);

    expect(summary.centralMotionContext).toContain('Cancer Stem Cells vs Dynamic Plasticity');
    expect(summary.centralMotionContext).toContain('Human Triple-Negative Breast Cancer PDX models');
    expect(summary.leadingHypothesisTitle).toBe('Dr. Elena Rostova');
    expect(summary.consensusScore).toBe(84);
    expect(summary.roundProgressionNarrative.length).toBe(1);
    expect(summary.consensusAgreements[0]).toContain('Dynamic plastic switching dominates');
    expect(summary.remainingCruxes[0]).toContain('Unresolved debate on whether in vitro organoids');
  });

  it('generateTranscriptMarkdown builds valid Markdown output', () => {
    const md = generateTranscriptMarkdown(mockSession);

    expect(md).toContain('# Scientific Debate Transcript & Research Dossier');
    expect(md).toContain('Dr. Elena Rostova');
    expect(md).toContain('Computational Oncologist');
    expect(md).toContain('Single-cell ATAC-seq demonstrates strict epigenetic commitment barriers.');
    expect(md).toContain('In Vivo Single-Cell Barcoding Trial');
  });

  it('generateTranscriptPlainText builds readable plain-text report', () => {
    const text = generateTranscriptPlainText(mockSession);

    expect(text).toContain('SCIENTIFIC DEBATE TRANSCRIPT');
    expect(text).toContain('MOTION: Cancer Stem Cells vs Dynamic Plasticity');
    expect(text).toContain('Dr. Elena Rostova');
    expect(text).toContain('SECTION 1: COMPLETE DEBATE TRANSCRIPT');
    expect(text).toContain('SECTION 2: EXECUTIVE SUMMARY');
  });

  it('generateTranscriptJSON outputs valid JSON string representing complete session data', () => {
    const jsonStr = generateTranscriptJSON(mockSession);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.metadata.id).toBe('session-test-1');
    expect(parsed.metadata.topic).toBe('Cancer Stem Cells vs Dynamic Plasticity');
    expect(parsed.agents.length).toBe(1);
    expect(parsed.transcriptRounds.length).toBe(1);
    expect(parsed.judgeSynthesis.consensusScore).toBe(84);
    expect(parsed.executiveSummaryAndTakeaways.consensusScore).toBe(84);
  });

  it('handles empty or minimal session gracefully without throwing exceptions', () => {
    const minimalSession: Partial<DebateSession> = {};
    const summary = extractSummaryAndTakeaways(minimalSession);
    const md = generateTranscriptMarkdown(minimalSession);
    const txt = generateTranscriptPlainText(minimalSession);
    const jsonStr = generateTranscriptJSON(minimalSession);

    expect(summary.consensusScore).toBeGreaterThanOrEqual(0);
    expect(typeof md).toBe('string');
    expect(typeof txt).toBe('string');
    expect(typeof jsonStr).toBe('string');
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });
});
