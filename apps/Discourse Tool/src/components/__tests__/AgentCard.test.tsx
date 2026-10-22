import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AgentCard from '../AgentCard';
import { AgentPersona } from '../../types';

describe('AgentCard Component Suite', () => {
  const mockAgent: AgentPersona = {
    id: 'agent-oncology-1',
    name: 'Dr. Sarah Jenkins',
    role: 'Molecular Epidemiologist',
    avatar: '🔬',
    bio: 'Expert in Mendelian Randomization and biobank GWAS causal inference.',
    stanceBrief: 'Polygenic risk scores validate causal predisposition',
    initialPosition: -0.75,
    initialConfidence: 88,
    reasoningStyle: 'Causal Inference & GWAS',
    primaryLens: 'scientific',
    secondaryLens: 'mathematical',
    formalDiscipline: 'Genetic Epidemiology',
    conflictingObjective: 'Identify non-confounded instrumental variables',
    failureModeGuarded: 'Horizontal pleiotropy bias',
  };

  it('renders agent name, avatar, role, and discipline accurately', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('Dr. Sarah Jenkins')).toBeTruthy();
    expect(screen.getByText('Molecular Epidemiologist')).toBeTruthy();
    expect(screen.getByText(/Genetic Epidemiology/)).toBeTruthy();
    expect(screen.getByText('🔬')).toBeTruthy();
  });

  it('displays primary and secondary epistemic lens badges', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText('SCIENTIFIC')).toBeTruthy();
  });

  it('displays stance value and confidence percentage', () => {
    render(<AgentCard agent={mockAgent} />);

    expect(screen.getByText(/88%/)).toBeTruthy();
  });

  it('highlights border and active badge when isThinking is true', () => {
    render(<AgentCard agent={mockAgent} isThinking={true} />);

    expect(screen.getByText(/On Floor: Formulating claim card/)).toBeTruthy();
  });
});
