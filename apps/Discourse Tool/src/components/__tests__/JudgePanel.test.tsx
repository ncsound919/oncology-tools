import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import JudgePanel from '../JudgePanel';
import { JudgeSynthesis } from '../../types';

describe('JudgePanel Component Suite', () => {
  const mockJudgeResult: JudgeSynthesis = {
    evaluationText: 'The synthesis demonstrates a strong shift toward dynamic state transition models under therapeutic stress.',
    winner: 'Reversible Epigenetic Plasticity Model',
    quadLensScores: {
      scientific: 92,
      mathematical: 88,
      philosophical: 85,
      moral: 90,
    },
    quadLensBreakdown: {
      scientificAnalysis: 'Multi-omic single-cell chromatin profiling confirms state transitions.',
      mathematicalAnalysis: 'Markov chain transition matrices fitted with high confidence.',
      philosophicalAnalysis: 'Ontological shift from static stemness to plastic state.',
      moralAnalysis: 'Ethical considerations prioritize minimizing treatment-induced toxicity.',
    },
    interconnectedChainAnalysis: 'Sequential cascade from scRNA-seq to clinical trial design.',
    candidateHypotheses: [
      {
        rank: 1,
        id: 'hypo-1',
        title: 'Reversible Epigenetic Plasticity Model',
        mechanism: 'Hypoxia-induced HIF2A activation drives dedifferentiation',
        calibratedConfidence: 0.91,
        highestEvidenceTier: 1,
        noveltyScore: 88,
        priorArtComparison: 'Extends standard Waddington landscape models',
        claimCards: [],
        falsificationProtocol: {
          hypothesisId: 'hypo-1',
          hypothesisTitle: 'Reversible Epigenetic Plasticity Model',
          targetMechanism: 'HIF2A-driven dedifferentiation',
          proposedPerturbation: 'Small-molecule HIF2A inhibition',
          biologicalModelSystem: 'PDX organoids',
          positiveControl: 'Knockdown construct',
          negativeControl: 'Scrambled vector',
          vehicleOrScrambledControl: 'DMSO control',
          powerAnalysis: { statisticalPower: 0.9, alpha: 0.05, effectSizeEstimate: '0.45 HR reduction', requiredSampleSize: '120 mice' },
          primaryEndpoints: ['PFS'],
          secondaryEndpoints: ['OS'],
          leakageAndConfounderChecks: ['Batch effect correction'],
          prespecifiedFalsificationThreshold: 'p > 0.05',
          timelineAndFeasibility: '18 months',
        },
      },
    ],
    claimAuditTrail: [
      {
        id: 'claim-1',
        claim: 'Chromatin accessibility changes within 48h of hypoxia',
        claimType: 'Causal / Mechanistic',
        evidenceTier: 1,
        confidence: 0.9,
        status: 'supported',
        evidence: [],
        counterevidence: [],
        alternativeExplanations: [],
        confidenceRationale: 'Replicated across independent cohorts',
        testablePrediction: 'Accessibility drops within 48h',
        falsifier: 'No accessibility change within 48h',
      },
    ],
    minorityReports: [
      {
        role: 'Adversarial Critic',
        agentName: 'Dr. Marcus Vance',
        dissentingClaim: 'Dedifferentiation is an artifact of in vitro culture conditions',
        evidenceBasis: 'In vivo barcoding shows non-reversible lineage traces',
        unresolvedGap: 'Lack of single-cell spatial proteomics in intact human tumors',
      },
    ],
    keyArguments: [
      {
        point: 'Therapy resistance arises from plastic switching rather than rare pre-existing mutations',
        strength: 9,
        contributor: 'Dr. Elena Rostova',
        lens: 'scientific',
      },
    ],
    dissent: 'Dissent remains regarding whether stromal signals override cell-intrinsic states.',
    openQuestions: ['What is the exact rate of dedifferentiation in human PDX organoids?'],
    noveltyVerdict: 'High novelty; no prior art directly links HIF2A to reversible plasticity.',
    preregisteredProtocols: [
      {
        hypothesisId: 'hypo-1',
        hypothesisTitle: 'Reversible Epigenetic Plasticity Model',
        targetMechanism: 'HIF2A-driven dedifferentiation',
        proposedPerturbation: 'Small-molecule HIF2A inhibition',
        biologicalModelSystem: 'PDX organoids',
        positiveControl: 'Knockdown construct',
        negativeControl: 'Scrambled vector',
        vehicleOrScrambledControl: 'DMSO control',
        powerAnalysis: { statisticalPower: 0.9, alpha: 0.05, effectSizeEstimate: '0.45 HR reduction', requiredSampleSize: '120 mice' },
        primaryEndpoints: ['PFS'],
        secondaryEndpoints: ['OS'],
        leakageAndConfounderChecks: ['Batch effect correction'],
        prespecifiedFalsificationThreshold: 'p > 0.05',
        timelineAndFeasibility: '18 months',
      },
    ],
    methodologicalAudit: {
      statisticalPowerSummary: 'Adequate power in the scRNA-seq cohort',
      leakageAndBiasRisks: ['Batch effects across trial sites'],
      controlSufficiency: 'Positive and negative controls specified',
    },
    consensusScore: 88,
  };

  it('renders loading state when isJudging is true', () => {
    render(<JudgePanel isJudging={true} />);

    expect(screen.getByText('SYNTHESIZING_SCIENTIFIC_ACCOUNTABILITY_DOSSIER...')).toBeTruthy();
  });

  it('renders empty placeholder when judgeResult is null', () => {
    render(<JudgePanel judgeResult={undefined} isJudging={false} />);

    expect(screen.getByText('Awaiting Scientific Synthesis & Experimental Falsification Dossier')).toBeTruthy();
  });

  it('renders top candidate hypothesis and quad-lens score cards', () => {
    render(<JudgePanel judgeResult={mockJudgeResult} isJudging={false} />);

    expect(screen.getAllByText(/Reversible Epigenetic Plasticity Model/).length).toBeGreaterThan(0);
    expect(screen.getByText(/CONVERGENCE/)).toBeTruthy();
    expect(screen.getByText(/synthesis demonstrates a strong shift/)).toBeTruthy();
  });

  it('navigates through dossier tabs (Candidate Hypotheses, Claim Audit, Minority Reports, Lenses)', () => {
    render(<JudgePanel judgeResult={mockJudgeResult} isJudging={false} />);

    // Default tab is Candidate Hypotheses
    expect(screen.getByText('RANK 1 CANDIDATE')).toBeTruthy();
    expect(screen.getByText('NOVELTY: 88% vs Literature')).toBeTruthy();

    // Click Claim Audit Trail tab
    const claimsTab = screen.getByText(/CLAIM AUDIT TRAIL/);
    fireEvent.click(claimsTab);
    expect(screen.getByText(/Chromatin accessibility changes within 48h/)).toBeTruthy();

    // Click Minority Reports tab
    const minorityTab = screen.getByText(/MINORITY REPORTS/);
    fireEvent.click(minorityTab);
    expect(screen.getByText(/DISSENTING SCIENTIST: Dr. Marcus Vance/)).toBeTruthy();
    expect(screen.getByText(/"Dedifferentiation is an artifact of in vitro culture conditions"/)).toBeTruthy();

    // Click Quad-Lens Deep Review tab
    const lensesTab = screen.getByText(/QUAD-LENS DEEP REVIEW/);
    fireEvent.click(lensesTab);
    expect(screen.getByText(/Epistemic Quad-Lens Synthesis/)).toBeTruthy();
    expect(screen.getByText(/Multi-omic single-cell chromatin profiling confirms state transitions/)).toBeTruthy();
  });

  it('triggers transcript report modal callback when onOpenTranscript button is clicked', () => {
    const handleOpenTranscript = vi.fn();

    render(<JudgePanel judgeResult={mockJudgeResult} isJudging={false} onOpenTranscript={handleOpenTranscript} />);

    const reportBtn = screen.getByText('Transcript & Report');
    fireEvent.click(reportBtn);

    expect(handleOpenTranscript).toHaveBeenCalledTimes(1);
  });
});
