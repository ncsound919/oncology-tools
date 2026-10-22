import { describe, it, expect } from 'vitest';
import { CANCER_RESEARCH_CONTROVERSIES } from '../cancerControversies';

describe('Cancer Research Controversies Data Suite', () => {
  it('contains comprehensive oncology controversy profiles', () => {
    expect(Array.isArray(CANCER_RESEARCH_CONTROVERSIES)).toBe(true);
    expect(CANCER_RESEARCH_CONTROVERSIES.length).toBe(5);
  });

  it('each controversy profile has valid required structure and quad-lens breakdown', () => {
    CANCER_RESEARCH_CONTROVERSIES.forEach((c) => {
      expect(c.id).toBeTruthy();
      expect(c.number).toBeGreaterThan(0);
      expect(c.title).toBeTruthy();
      expect(c.shortTitle).toBeTruthy();
      expect(c.tagline).toBeTruthy();
      expect(c.centralDebate).toBeTruthy();
      expect(c.keyDilemma).toBeTruthy();

      // Proponent Position
      expect(c.proponentPosition.title).toBeTruthy();
      expect(c.proponentPosition.claim).toBeTruthy();
      expect(Array.isArray(c.proponentPosition.keyArguments)).toBe(true);

      // Skeptic Position
      expect(c.skepticPosition.title).toBeTruthy();
      expect(c.skepticPosition.claim).toBeTruthy();
      expect(Array.isArray(c.skepticPosition.keyArguments)).toBe(true);

      // Methodological Challenge
      expect(c.methodologicalChallenge.title).toBeTruthy();
      expect(c.methodologicalChallenge.description).toBeTruthy();

      // Clinical Settings and Examples
      expect(Array.isArray(c.clinicalSettings)).toBe(true);
      expect(c.clinicalSettings.length).toBeGreaterThan(0);
      expect(Array.isArray(c.specificExamples)).toBe(true);

      // Epistemic Lenses
      expect(c.epistemicLenses.scientific).toBeTruthy();
      expect(c.epistemicLenses.mathematical).toBeTruthy();
      expect(c.epistemicLenses.philosophical).toBeTruthy();
      expect(c.epistemicLenses.moral).toBeTruthy();
    });
  });

  it('includes key landmark controversies like overdiagnosis, MCED blood tests, and immunotherapy', () => {
    const ids = CANCER_RESEARCH_CONTROVERSIES.map((c) => c.id);
    expect(ids).toContain('screening-and-overdiagnosis');
    expect(ids).toContain('new-blood-tests-and-biopsies');
    expect(ids).toContain('immunotherapy-evidence-and-endpoints');
  });
});
