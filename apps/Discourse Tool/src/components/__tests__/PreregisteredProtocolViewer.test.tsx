import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PreregisteredProtocolViewer from '../PreregisteredProtocolViewer';
import { ExperimentalProtocol } from '../../types';

describe('PreregisteredProtocolViewer Component Suite', () => {
  const mockProtocol: ExperimentalProtocol = {
    hypothesisId: 'hypo-101',
    hypothesisTitle: 'Lineage Barcoding Under Platinum Stress',
    targetMechanism: 'HIF2A-mediated cell fate transitions',
    proposedPerturbation: 'Small molecule inhibitor PT2385 vs DMSO control',
    biologicalModelSystem: 'Patient-Derived Xenograft (PDX) Organoid Cohort',
    positiveControl: 'CRISPR-Cas9 HIF2A Knockout line',
    negativeControl: 'Scrambled sgRNA vector line',
    vehicleOrScrambledControl: '0.1% DMSO vehicle',
    powerAnalysis: {
      statisticalPower: 0.9,
      alpha: 0.05,
      effectSizeEstimate: '35% reduction in tumor recurrence',
      requiredSampleSize: '120 mice per arm',
    },
    primaryEndpoints: ['Progression-Free Survival (PFS)'],
    secondaryEndpoints: ['Overall Survival (OS)', 'Circulating Tumor DNA (ctDNA) dynamics'],
    prespecifiedFalsificationThreshold: 'p > 0.05 on log-rank test for PFS benefit',
    leakageAndConfounderChecks: ['Host immune background controls', 'Batch effect normalization'],
    timelineAndFeasibility: '12 months',
  };

  it('renders title, perturbation, biological model system, and feasibility', () => {
    render(<PreregisteredProtocolViewer protocol={mockProtocol} />);

    expect(screen.getByText('Lineage Barcoding Under Platinum Stress')).toBeTruthy();
    expect(screen.getByText('Small molecule inhibitor PT2385 vs DMSO control')).toBeTruthy();
    expect(screen.getByText('Patient-Derived Xenograft (PDX) Organoid Cohort')).toBeTruthy();
    expect(screen.getByText('Feasibility: 12 months')).toBeTruthy();
  });

  it('displays validated laboratory controls (positive, negative, vehicle)', () => {
    render(<PreregisteredProtocolViewer protocol={mockProtocol} />);

    expect(screen.getByText('CRISPR-Cas9 HIF2A Knockout line')).toBeTruthy();
    expect(screen.getByText('Scrambled sgRNA vector line')).toBeTruthy();
    expect(screen.getByText('0.1% DMSO vehicle')).toBeTruthy();
  });

  it('renders power analysis stats (Power %, Alpha, Effect Size, Sample Size)', () => {
    render(<PreregisteredProtocolViewer protocol={mockProtocol} />);

    expect(screen.getByText('90%')).toBeTruthy(); // Power
    expect(screen.getByText('0.05')).toBeTruthy(); // Alpha
    expect(screen.getByText('35% reduction in tumor recurrence')).toBeTruthy();
    expect(screen.getByText('N=120 mice per arm')).toBeTruthy();
  });

  it('renders pre-specified falsification threshold', () => {
    render(<PreregisteredProtocolViewer protocol={mockProtocol} />);

    expect(screen.getByText('"p > 0.05 on log-rank test for PFS benefit"')).toBeTruthy();
  });
});
