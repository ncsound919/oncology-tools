import { describe, it, expect } from 'vitest';
import { dossierCandidates, dossierToHypotheses } from './discourse.js';

const dossier = {
  winner: 'Reversible plasticity model',
  candidateHypotheses: [
    { rank: 2, id: 'h2', title: 'Stromal HIF2A drives resistance', mechanism: 'hypoxia loop', calibratedConfidence: 0.42, noveltyScore: 60, claimCards: [{ id: 'c1' }] },
    { rank: 1, id: 'h1', title: 'Reversible epigenetic plasticity', mechanism: 'Waddington well switching', calibratedConfidence: 0.71, noveltyScore: 80, claimCards: [{ id: 'c1' }, { id: 'c2' }] },
    { rank: 3, title: '   ' }, // blank title must be dropped
  ],
};

describe('srt discourse bridge', () => {
  it('extracts and ranks candidate hypotheses, dropping blanks', () => {
    const c = dossierCandidates(dossier);
    expect(c).toHaveLength(2);
    expect(c[0]!.rank).toBe(1);
    expect(c[0]!.title).toBe('Reversible epigenetic plasticity');
    expect(c[0]!.claimCardCount).toBe(2);
  });

  it('tolerates an empty or malformed dossier', () => {
    expect(dossierCandidates(null)).toEqual([]);
    expect(dossierCandidates({})).toEqual([]);
    expect(dossierCandidates({ candidateHypotheses: 'nope' })).toEqual([]);
  });

  it('maps candidates to registry inputs at evidence tier 5 (no independent evidence)', () => {
    const inputs = dossierToHypotheses(dossier, { studyId: 'study_x' });
    expect(inputs).toHaveLength(2);
    expect(inputs[0]!.evidenceTier).toBe(5);
    expect(inputs[0]!.sourceStudyId).toBe('study_x');
    expect(inputs[0]!.title).toBe('Reversible epigenetic plasticity');
  });
});
