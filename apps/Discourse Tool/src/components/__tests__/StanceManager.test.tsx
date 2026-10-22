import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StanceManager from '../StanceManager';
import { StanceCard } from '../../types';

describe('StanceManager Component Suite', () => {
  const mockStanceCards: StanceCard[] = [
    {
      id: 'sc-1',
      title: 'H1: Hierarchical Stem Cell Model',
      claim: 'Cancer stem cells are solely responsible for relapse following chemotherapy.',
      reasoning: 'Explains lineage-restricted differentiation hierarchies',
      confidence: 85,
      isActive: true,
    },
    {
      id: 'sc-2',
      title: 'H2: Stochastic Plasticity Model',
      claim: 'Any non-stem tumor cell can re-acquire stemness under hypoxic stress.',
      reasoning: 'Reversible state transitions challenge hierarchical targeting',
      confidence: 78,
      isActive: false,
    },
  ];

  it('renders list of stance cards with title, claim, confidence score', () => {
    render(
      <StanceManager
        stanceCards={mockStanceCards}
        onToggleCard={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />
    );

    expect(screen.getByText('H1: Hierarchical Stem Cell Model')).toBeTruthy();
    expect(screen.getByText('H2: Stochastic Plasticity Model')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('78%')).toBeTruthy();
  });

  it('triggers onToggleCard when a card item is clicked', () => {
    const handleToggle = vi.fn();

    render(
      <StanceManager
        stanceCards={mockStanceCards}
        onToggleCard={handleToggle}
        onAddCard={vi.fn()}
        onDeleteCard={vi.fn()}
      />
    );

    const card = screen.getByText('H2: Stochastic Plasticity Model');
    fireEvent.click(card);

    expect(handleToggle).toHaveBeenCalledWith('sc-2');
  });

  it('triggers onDeleteCard when trash icon is clicked', () => {
    const handleDelete = vi.fn();

    render(
      <StanceManager
        stanceCards={mockStanceCards}
        onToggleCard={vi.fn()}
        onAddCard={vi.fn()}
        onDeleteCard={handleDelete}
      />
    );

    const deleteBtns = screen.getAllByTitle('Remove Card');
    fireEvent.click(deleteBtns[0]);

    expect(handleDelete).toHaveBeenCalledWith('sc-1');
  });

  it('opens creation form and triggers onAddCard on submit', () => {
    const handleAdd = vi.fn();

    render(
      <StanceManager
        stanceCards={mockStanceCards}
        onToggleCard={vi.fn()}
        onAddCard={handleAdd}
        onDeleteCard={vi.fn()}
      />
    );

    // Click ADD_HYPOTHESIS
    const addBtn = screen.getByText('ADD_HYPOTHESIS');
    fireEvent.click(addBtn);

    // Fill inputs
    const titleInput = screen.getByPlaceholderText('e.g. H1: Information loss at handoff');
    const claimInput = screen.getByPlaceholderText('State the testable claim...');
    const reasoningInput = screen.getByPlaceholderText('Why this matters in clinical/system design...');

    fireEvent.change(titleInput, { target: { value: 'H3: Immunogenic Niches' } });
    fireEvent.change(claimInput, { target: { value: 'Stromal crosstalk prevents immune recognition' } });
    fireEvent.change(reasoningInput, { target: { value: 'Inhibits T cell infiltration' } });

    // Submit form
    const submitBtn = screen.getByText('INJECT_CARD_INTO_ORCHESTRATOR');
    fireEvent.click(submitBtn);

    expect(handleAdd).toHaveBeenCalledWith({
      title: 'H3: Immunogenic Niches',
      claim: 'Stromal crosstalk prevents immune recognition',
      reasoning: 'Inhibits T cell infiltration',
      confidence: 80,
    });
  });
});
