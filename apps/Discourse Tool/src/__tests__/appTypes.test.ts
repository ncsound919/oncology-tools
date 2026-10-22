import { describe, it, expect } from 'vitest';
import {
  DebateFormat,
  ToneStyle,
  ModelEngine,
  EpistemicLens,
  ScientificRoleType,
  EvidenceTier,
} from '../types';

describe('App Types and Domain Definitions Suite', () => {
  it('verifies valid DebateFormat values', () => {
    const validFormats: DebateFormat[] = ['roundtable', 'oxford', 'socratic'];
    expect(validFormats.length).toBe(3);
    expect(validFormats).toContain('roundtable');
    expect(validFormats).toContain('oxford');
    expect(validFormats).toContain('socratic');
  });

  it('verifies valid ToneStyle values', () => {
    const validTones: ToneStyle[] = ['intellectual', 'slang', 'layman', 'authoritative'];
    expect(validTones.length).toBe(4);
    expect(validTones).toContain('intellectual');
    expect(validTones).toContain('authoritative');
  });

  it('verifies supported ModelEngine choices', () => {
    const validEngines: ModelEngine[] = ['gemini', 'llama'];
    expect(validEngines.length).toBe(2);
    expect(validEngines).toContain('gemini');
    expect(validEngines).toContain('llama');
  });

  it('verifies the 4 Epistemic Lenses', () => {
    const lenses: EpistemicLens[] = ['scientific', 'mathematical', 'philosophical', 'moral'];
    expect(lenses.length).toBe(4);
    expect(lenses).toContain('scientific');
    expect(lenses).toContain('mathematical');
    expect(lenses).toContain('philosophical');
    expect(lenses).toContain('moral');
  });

  it('verifies EvidenceTier range mapping', () => {
    const tiers: EvidenceTier[] = [0, 1, 2, 3, 4, 5];
    expect(tiers.length).toBe(6);
  });
});
