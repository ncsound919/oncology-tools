import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ClaimCardViewer from '../ClaimCardViewer';
import { ClaimCard } from '../../types';

describe('ClaimCardViewer Component Suite', () => {
  const mockClaimCard: ClaimCard = {
    id: 'claim-101',
    claim: 'Single-cell chromatin accessibility correlates with therapy resistance in PDX models',
    claimType: 'Causal / Mechanistic',
    evidenceTier: 1,
    confidence: 0.88,
    confidenceRationale: 'Replicated across 3 independent multi-center PDX cohorts',
    status: 'supported',
    evidence: [
      {
        id: 'ev-1',
        studyId: 'NATURE-ONC-2025',
        tier: 1,
        passageOrFinding: 'ATAC-seq peaks confirm non-reversible lineage commitment',
        experimentalSystem: 'Human PDX Organoid',
        sampleSize: '500,000 cells',
        effectSize: '3.2-fold reduction in peak height',
      },
    ],
    counterevidence: [
      {
        id: 'ce-1',
        studyId: 'CELL-2024',
        conflictingFinding: 'In vitro 2D cell lines show transient reversibility',
        contextDifferences: '2D culture vs 3D PDX stromal microenvironment',
        tier: 1,
      },
    ],
    testablePrediction: 'Oct4 locus accessibility drops 10-fold within 48h of differentiation',
    falsifier: 'Observation of active transcription factors at Oct4 locus during late differentiation',
    alternativeExplanations: ['Stromal hypoxia signaling confounding epigenetic mark counts'],
    numericalFidelity: {
      sampleSize: '500,000 cells',
      effectDirection: 'Decreased accessibility',
      pValue: 'p < 0.001',
    },
  };

  it('renders claim text, evidence tier badge, and calibrated confidence probability', () => {
    render(<ClaimCardViewer claimCard={mockClaimCard} compact={false} />);

    expect(screen.getByText(/Single-cell chromatin accessibility correlates with therapy resistance/)).toBeTruthy();
    expect(screen.getByText(/TIER 1: REPLICATION/)).toBeTruthy();
    expect(screen.getByText('88%')).toBeTruthy();
    expect(screen.getByText('SUPPORTED')).toBeTruthy();
  });

  it('renders numerical fidelity metrics correctly', () => {
    render(<ClaimCardViewer claimCard={mockClaimCard} compact={false} />);

    expect(screen.getByText('NUMERICAL FIDELITY:')).toBeTruthy();
    expect(screen.getByText('N=500,000 cells')).toBeTruthy();
    expect(screen.getByText('p-value: p < 0.001')).toBeTruthy();
  });

  it('allows switching between Evidence, Counterevidence, Falsification, and Alternatives tabs', () => {
    render(<ClaimCardViewer claimCard={mockClaimCard} compact={false} />);

    // Default tab is Supporting Evidence
    expect(screen.getByText(/"ATAC-seq peaks confirm non-reversible lineage commitment"/)).toBeTruthy();

    // Switch to Counterevidence subtab
    const counterTab = screen.getByText(/COUNTEREVIDENCE/);
    fireEvent.click(counterTab);
    expect(screen.getByText(/CONFLICTING STUDY: CELL-2024/)).toBeTruthy();

    // Switch to Falsification Criterion subtab
    const falsifierTab = screen.getByText(/FALSIFICATION CRITERION/);
    fireEvent.click(falsifierTab);
    expect(screen.getByText(/Decisive Falsification Criterion:/)).toBeTruthy();
    expect(screen.getByText(/Observation of active transcription factors/)).toBeTruthy();

    // Switch to Alternative Explanations subtab
    const altTab = screen.getByText(/ALTERNATIVE EXPLANATIONS/);
    fireEvent.click(altTab);
    expect(screen.getByText(/Stromal hypoxia signaling confounding/)).toBeTruthy();
  });
});
