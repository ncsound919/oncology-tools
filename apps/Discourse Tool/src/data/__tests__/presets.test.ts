import { describe, it, expect } from 'vitest';
import {
  DEBATE_PRESETS,
  TUMOR_RESEARCH_QUESTIONS_8,
  HARDEST_QUESTIONS_CANCER,
  CANCER_RESEARCH_CONTROVERSIES,
} from '../presets';

describe('Debate Presets Data Integrity Suite', () => {
  it('DEBATE_PRESETS is an array containing all key pre-configured scenarios', () => {
    expect(Array.isArray(DEBATE_PRESETS)).toBe(true);
    expect(DEBATE_PRESETS.length).toBeGreaterThanOrEqual(8);

    const presetIds = DEBATE_PRESETS.map((p) => p.id);
    expect(presetIds).toContain('cancer-research-live-controversies');
    expect(presetIds).toContain('eight-tumor-research-questions');
    expect(presetIds).toContain('scenario-doctors-under-pressure');
    expect(presetIds).toContain('scenario-scientists-varying-methods');
    expect(presetIds).toContain('scenario-young-vs-veteran-scientist');
  });

  it('Every DEBATE_PRESET has valid required attributes and non-empty stances', () => {
    DEBATE_PRESETS.forEach((preset) => {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.topic).toBeTruthy();
      expect(preset.badge).toBeTruthy();
      expect(preset.materials).toBeTruthy();
      expect(Array.isArray(preset.stanceCards)).toBe(true);
      expect(preset.stanceCards.length).toBeGreaterThan(0);

      preset.stanceCards.forEach((card) => {
        expect(card.id).toBeTruthy();
        expect(card.title).toBeTruthy();
        expect(card.claim).toBeTruthy();
        expect(card.reasoning).toBeTruthy();
      });
    });
  });

  it('TUMOR_RESEARCH_QUESTIONS_8 has exactly 8 high-impact questions', () => {
    expect(TUMOR_RESEARCH_QUESTIONS_8.length).toBe(8);

    TUMOR_RESEARCH_QUESTIONS_8.forEach((q, idx) => {
      expect(q.number).toBe(idx + 1);
      expect(q.question).toBeTruthy();
      expect(q.shortTitle).toBeTruthy();
      expect(q.positionA.title).toBeTruthy();
      expect(q.positionA.claim).toBeTruthy();
      expect(q.positionB.title).toBeTruthy();
      expect(q.positionB.claim).toBeTruthy();
      expect(q.scientificLens).toBeTruthy();
      expect(q.mathematicalLens).toBeTruthy();
      expect(q.philosophicalLens).toBeTruthy();
      expect(q.moralLens).toBeTruthy();
    });
  });

  it('HARDEST_QUESTIONS_CANCER contains hard oncology questions with quad-lens breakdown', () => {
    expect(HARDEST_QUESTIONS_CANCER.length).toBeGreaterThan(0);

    HARDEST_QUESTIONS_CANCER.forEach((hq) => {
      expect(hq.number).toBeGreaterThan(0);
      expect(hq.question).toBeTruthy();
      expect(hq.difficultyCause).toBeTruthy();
      expect(hq.impactWhyItMatters).toBeTruthy();
      expect(hq.scientificLens).toBeTruthy();
      expect(hq.mathematicalLens).toBeTruthy();
      expect(hq.philosophicalLens).toBeTruthy();
      expect(hq.moralLens).toBeTruthy();
      expect(Array.isArray(hq.citations)).toBe(true);
    });
  });

  it('CANCER_RESEARCH_CONTROVERSIES exports non-empty controversies dataset', () => {
    expect(Array.isArray(CANCER_RESEARCH_CONTROVERSIES)).toBe(true);
    expect(CANCER_RESEARCH_CONTROVERSIES.length).toBeGreaterThan(0);
  });
});
