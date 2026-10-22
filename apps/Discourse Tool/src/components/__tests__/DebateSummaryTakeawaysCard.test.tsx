import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DebateSummaryTakeawaysCard from '../DebateSummaryTakeawaysCard';
import { DebateSession } from '../../types';

describe('DebateSummaryTakeawaysCard Component Suite', () => {
  const mockSession: Partial<DebateSession> = {
    id: 'test-session-101',
    topic: 'Stochastic Plasticity vs Hierarchical Stemness in Oncology',
    rounds: [
      {
        roundIndex: 0,
        name: 'Opening Claims',
        description: 'Opening claim cards',
        allocatedTimeSeconds: 180,
        elapsedTimeSeconds: 90,
        statements: [
          {
            agentId: 'agent-1',
            agentName: 'Dr. Elena Rostova',
            avatar: '🧬',
            role: 'Computational Oncologist',
            roundIndex: 0,
            statementText: 'Single-cell chromatin accessibility reveals epigenetic plasticity.',
            updatedPosition: 0.85,
            updatedConfidence: 92,
            reasonForUpdate: 'Empirical single-cell data supports plasticity',
            timing: {
              timestamp: 'T+00:30',
              elapsedSessionSeconds: 30,
              allocatedSeconds: 45,
              durationSeconds: 30,
              timeStatus: 'within_window',
              speakingPaceWpm: 150,
            },
          },
        ],
      },
    ],
    judgeResult: {
      evaluationText: 'Epigenetic state switching under stress explains therapy escape.',
      winner: 'Reversible Plasticity Model',
      consensusScore: 85,
      candidateHypotheses: [
        {
          rank: 1,
          id: 'hyp-1',
          title: 'Reversible Epigenetic Plasticity Model',
          mechanism: 'HIF2A-mediated dedifferentiation under hypoxia',
          calibratedConfidence: 0.89,
          highestEvidenceTier: 1,
          noveltyScore: 85,
          priorArtComparison: 'Extends static stemness models',
          claimCards: [],
          falsificationProtocol: {
            hypothesisId: 'hyp-1',
            hypothesisTitle: 'Reversible Epigenetic Plasticity Model',
            targetMechanism: 'HIF2A-driven dedifferentiation',
            proposedPerturbation: 'HIF2A inhibition',
            biologicalModelSystem: 'PDX organoids',
            positiveControl: 'Knockdown',
            negativeControl: 'Scrambled vector',
            vehicleOrScrambledControl: 'DMSO',
            powerAnalysis: { statisticalPower: 0.9, alpha: 0.05, effectSizeEstimate: '0.45 HR', requiredSampleSize: '120 mice' },
            primaryEndpoints: ['PFS'],
            secondaryEndpoints: ['OS'],
            leakageAndConfounderChecks: ['Batch correction'],
            prespecifiedFalsificationThreshold: 'p > 0.05',
            timelineAndFeasibility: '18 months',
          },
        },
      ],
      claimAuditTrail: [],
      minorityReports: [],
      keyArguments: [],
      dissent: 'In vivo validation still required.',
      openQuestions: [],
      quadLensScores: {
        scientific: 90,
        mathematical: 85,
        philosophical: 80,
        moral: 88,
      },
      quadLensBreakdown: {
        scientificAnalysis: 'Strong multi-omic evidence',
        mathematicalAnalysis: 'Markov models fitted',
        philosophicalAnalysis: 'Plasticity ontology',
        moralAnalysis: 'Toxicity minimized',
      },
      interconnectedChainAnalysis: 'From scRNA-seq to trial design.',
      noveltyVerdict: 'Novel link between HIF2A and plasticity.',
      preregisteredProtocols: [],
      methodologicalAudit: {
        statisticalPowerSummary: 'Adequate',
        leakageAndBiasRisks: ['Batch effects'],
        controlSufficiency: 'Adequate',
      },
    },
  };

  it('returns null if there are no statements in the session', () => {
    const { container } = render(
      <DebateSummaryTakeawaysCard session={{ rounds: [] }} onOpenFullTranscript={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders executive summary header and consensus hypothesis title', () => {
    render(
      <DebateSummaryTakeawaysCard session={mockSession} onOpenFullTranscript={vi.fn()} />
    );

    expect(screen.getByText('Debate Executive Summary & Major Takeaways')).toBeTruthy();
    expect(screen.getByText('Reversible Plasticity Model')).toBeTruthy();
    expect(screen.getByText(/HIF2A-mediated dedifferentiation under hypoxia/)).toBeTruthy();
  });

  it('triggers onOpenFullTranscript when Open Full Report button is clicked', () => {
    const handleOpenModal = vi.fn();

    render(
      <DebateSummaryTakeawaysCard session={mockSession} onOpenFullTranscript={handleOpenModal} />
    );

    const openBtn = screen.getByTitle('Open comprehensive transcript dossier');
    fireEvent.click(openBtn);

    expect(handleOpenModal).toHaveBeenCalledTimes(1);
  });
});
