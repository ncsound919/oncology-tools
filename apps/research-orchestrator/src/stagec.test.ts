import { describe, it, expect } from 'vitest';
import { buildStageCBody, dispatchStageCToSystem, getStageCSpec, STAGE_C_ROSTER, validateStageCInputs } from './stagec.js';
import type { FleetSystem, Study } from './types.js';

const baseStudy: Pick<Study, 'id' | 'query' | 'directive'> = {
  id: 'study_test',
  query: 'KRAS G12D resistance',
  directive: { objective: 'Map mechanisms of KRAS G12D resistance.', questions: [], direction: 'mechanism-mapping' },
};

function sys(id: string): FleetSystem {
  return { id: id as FleetSystem['id'], name: id, root: '.', baseUrl: 'http://localhost:59998', healthPath: null, domains: ['oncology'], runHint: '', kind: 'primary' };
}

describe('Stage C input gate', () => {
  it('mechanism-fusion is GET with no required inputs', () => {
    const spec = getStageCSpec('overlay-oncology')!;
    expect(spec.method).toBe('GET');
    expect(spec.requiredInputs).toEqual([]);
    expect(validateStageCInputs(spec, { stageCInputs: undefined }).ok).toBe(true);
  });

  it('oncoforesight narrative requires patientId', () => {
    const spec = getStageCSpec('oncoforesight')!;
    expect(validateStageCInputs(spec, { stageCInputs: {} }).ok).toBe(false);
    expect(validateStageCInputs(spec, { stageCInputs: { oncoforesight: { patientId: 'p1' } } }).ok).toBe(true);
  });

  it('discourse requires a topic', () => {
    const spec = getStageCSpec('discourse')!;
    expect(spec.requiredInputs).toEqual(['topic']);
    expect(validateStageCInputs(spec, { stageCInputs: { discourse: { topic: null } } }).missing).toEqual(['topic']);
  });

  it('flags narrated systems so claims can be tagged', () => {
    expect(getStageCSpec('oncoforesight')!.evidenceClass).toBe('narrated');
    expect(getStageCSpec('discourse')!.evidenceClass).toBe('narrated');
    expect(getStageCSpec('overlay-oncology')!.evidenceClass).toBe('computed');
  });
});

describe('Stage C request bodies', () => {
  it('discourse forwards topic + optional agents/rounds', () => {
    const spec = getStageCSpec('discourse')!;
    const body = buildStageCBody(spec, { ...baseStudy, stageCInputs: { discourse: { topic: 'statins in KRAS', agents: ['a', 'b'], rounds: 3 } } });
    expect(body.topic).toBe('statins in KRAS');
    expect(body.agents).toEqual(['a', 'b']);
    expect(body.rounds).toBe(3);
  });

  it('oncoforesight narrative passes only patientId/armLabel/focus', () => {
    const spec = getStageCSpec('oncoforesight')!;
    const body = buildStageCBody(spec, { ...baseStudy, stageCInputs: { oncoforesight: { patientId: 'p1', armLabel: 'Arm B', focus: 'resistance' } } });
    expect(body).toEqual({ patientId: 'p1', armLabel: 'Arm B', focus: 'resistance' });
  });
});

describe('Stage C dispatch gate (no network on validation failure)', () => {
  it('returns a validationError without calling an unreachable server', async () => {
    const res = await dispatchStageCToSystem(sys('discourse'), baseStudy);
    expect(res.ok).toBe(false);
    expect(res.validationError).toContain('topic');
    expect(res.httpStatus).toBeUndefined();
    expect(res.latencyMs).toBeLessThan(100);
  });

  it('CLI-only helixforge reports availability, not a synthesis result', async () => {
    const cli = { ...sys('helixforge'), baseUrl: null };
    const res = await dispatchStageCToSystem(cli, baseStudy);
    expect(res.ok).toBe(true);
    expect(res.stage).toBe('synthesis');
    expect(String((res.body as any).note)).toContain('CLI-only');
  });
});