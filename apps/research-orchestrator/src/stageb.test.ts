import { describe, it, expect } from 'vitest';
import { buildStageBBody, dispatchStageBToSystem, getStageBSpec, STAGE_B_ROSTER, validateStageBInputs } from './stageb.js';
import type { FleetSystem, Study } from './types.js';

const baseStudy: Pick<Study, 'id' | 'query'> = { id: 'study_test', query: 'KRAS G12D resistance' };

function sys(id: string): FleetSystem {
  return { id: id as FleetSystem['id'], name: id, root: '.', baseUrl: 'http://localhost:59999', healthPath: null, domains: ['oncology'], runHint: '', kind: 'primary' };
}

describe('Stage B input gate', () => {
  it('requires every required input to be present and non-null', () => {
    const spec = getStageBSpec('oncoforesight')!;
    expect(validateStageBInputs(spec, { stageBInputs: {} }).ok).toBe(false);
    expect(validateStageBInputs(spec, { stageBInputs: { oncoforesight: { patientId: 'p1', armLabel: null } } }).missing).toEqual(['armLabel']);
    expect(validateStageBInputs(spec, { stageBInputs: { oncoforesight: { patientId: 'p1', armLabel: 'Arm B' } } }).ok).toBe(true);
  });

  it('attec has no required inputs (upstream defaults are real)', () => {
    const spec = getStageBSpec('attec')!;
    expect(spec.requiredInputs).toEqual([]);
    expect(validateStageBInputs(spec, { stageBInputs: undefined }).ok).toBe(true);
  });

  it('flags narrated systems so claims can be tagged', () => {
    expect(getStageBSpec('oncograph')!.evidenceClass).toBe('narrated');
    for (const s of STAGE_B_ROSTER.filter(x => x.id !== 'oncograph')) {
      expect(s.evidenceClass).toBe('computed');
    }
  });
});

describe('Stage B request bodies', () => {
  it('overlay-oncology always sends ic50 (upstream rejects without it)', () => {
    const spec = getStageBSpec('overlay-oncology')!;
    const body = buildStageBBody(spec, { ...baseStudy, stageBInputs: { 'overlay-oncology': { ic50: 0.5 } } });
    expect(body.ic50).toBe(0.5);
    expect(typeof body.steps).toBe('number');
  });

  it('oncoforesight passes only patientId/armLabel/timepointId', () => {
    const spec = getStageBSpec('oncoforesight')!;
    const body = buildStageBBody(spec, { ...baseStudy, stageBInputs: { oncoforesight: { patientId: 'p1', armLabel: 'Arm B', timepointId: 'tp3' } } });
    expect(body).toEqual({ patientId: 'p1', armLabel: 'Arm B', timepointId: 'tp3' });
  });

  it('oncograph forwards the mutation spec verbatim', () => {
    const spec = getStageBSpec('oncograph')!;
    const mutation = { gene: 'EGFR', hgvsP: 'p.T790M', vaf: 0.4, ccf: 0.5, cloneId: 'c2' };
    const body = buildStageBBody(spec, { ...baseStudy, stageBInputs: { oncograph: { mutation, sample: { cancerType: 'NSCLC' } } } });
    expect(body.mutation).toEqual(mutation);
    expect((body as any).sample).toEqual({ cancerType: 'NSCLC' });
  });
});

describe('Stage B dispatch gate (no network on validation failure)', () => {
  it('returns a validationError without calling an unreachable server', async () => {
    const res = await dispatchStageBToSystem(sys('oncoforesight'), baseStudy);
    expect(res.ok).toBe(false);
    expect(res.validationError).toContain('patientId');
    expect(res.httpStatus).toBeUndefined();
    expect(res.latencyMs).toBeLessThan(100);
  });

  it('validation error names the missing inputs and the fix', async () => {
    const res = await dispatchStageBToSystem(sys('chemlab'), baseStudy);
    expect(res.validationError).toContain('temperature');
    expect(res.validationError).toContain('totalTime');
    expect(res.validationError).toContain('stageBInputs["chemlab"]');
  });
});
