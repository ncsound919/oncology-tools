/**
 * Genomic knowledge + drug/trial intelligence routes.
 *
 * Registered against the app's existing `apiRouter` so the whole app keeps one
 * route table. Every route returns `{ available: false, reason }` — never a
 * fabricated value — when its upstream is unreachable.
 */
import { Router, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { PatientCase } from '../../src/types/oncology';
import {
  CancerTypeResolution,
  resolveCancerType,
  searchOncoTree,
  getOncoTreeStatus,
  initOncoTree,
  ONCOTREE_ATTRIBUTION,
} from '../genomics/oncotree';
import {
  fetchCivicVariantEvidence,
  searchCivicEvidence,
  toCivicMolecularProfile,
  civicAttribution,
} from '../genomics/civic';
import { annotateVariantVEP, vepAttribution } from '../genomics/vep';
import { fetchTargetDruggability, openTargetsAttribution } from '../drugs/opentargets';
import { fetchDrugProfiles, chemblAttribution } from '../drugs/chembl';
import { buildGenomicEnrichment, enrichmentCacheSize } from '../enrichment';
import { buildTrialMatchProfile, matchTrialsForPatient } from '../trials/biomarker-matcher';

export function registerGenomicKnowledgeRoutes(router: Router): void {
  // 29. OncoTree — malignancy ontology lookup
  router.get('/external/oncotree', (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const term = String(req.query.q || req.query.name || req.query.code || '').trim();
      if (!term) {
        res.json(getOncoTreeStatus());
        return;
      }
      const records = searchOncoTree(term, Math.min(Math.max(Number(req.query.limit) || 10, 1), 50));
      const resolution: CancerTypeResolution = resolveCancerType(term);
      res.json({
        available: true,
        source: 'oncotree',
        query: term,
        ontologyVersion: process.env.ONCOTREE_VERSION || 'oncotree_latest_stable',
        totalHits: records.length,
        hits: records,
        resolution,
        attribution: ONCOTREE_ATTRIBUTION,
      });
    } catch (err: unknown) {
      res.status(500).json({ available: false, source: 'oncotree', error: err instanceof Error ? err.message : 'OncoTree query error' });
    }
  });

  // 30. OncoTree refresh — pull the live ontology and rewrite the local cache
  router.post('/external/oncotree/refresh', async (_req: ExpressRequest, res: ExpressResponse) => {
    try {
      const result = await initOncoTree(true);
      res.json({ available: true, ...result, status: getOncoTreeStatus(), attribution: ONCOTREE_ATTRIBUTION });
    } catch (err: unknown) {
      res.status(502).json({ available: false, source: 'oncotree', error: err instanceof Error ? err.message : 'OncoTree refresh failed' });
    }
  });

  // 31. CIViC — live variant evidence for one alteration
  router.get('/external/civic/evidence', async (req: ExpressRequest, res: ExpressResponse) => {
    const gene = String(req.query.gene || '').trim();
    const alteration = String(req.query.alteration || req.query.hgvs || '').trim();
    if (!gene && !alteration) {
      res.status(400).json({ error: 'Provide gene and alteration', source: 'civic' });
      return;
    }
    const evidence = await fetchCivicVariantEvidence(gene, alteration);
    res.status(evidence.available ? 200 : 502).json({
      ...evidence,
      molecularProfileSuggested: toCivicMolecularProfile(gene, alteration),
      attribution: civicAttribution(),
    });
  });

  // 31b. CIViC — generic evidence search
  router.get('/external/civic/search', async (req: ExpressRequest, res: ExpressResponse) => {
    const level = String(req.query.level || '').trim().toUpperCase();
    const result = await searchCivicEvidence({
      molecularProfile: String(req.query.query || req.query.molecularProfile || '').trim() || undefined,
      disease: String(req.query.disease || '').trim() || undefined,
      therapy: String(req.query.therapy || '').trim() || undefined,
      level: (['A', 'B', 'C', 'D', 'E'].includes(level) ? level : undefined) as 'A' | 'B' | 'C' | 'D' | 'E' | undefined,
      limit: Number(req.query.limit) || 10,
    });
    res.status(result.available ? 200 : 502).json(result);
  });

  // 32. Ensembl VEP — functional consequence + population frequency
  router.get('/external/vep', async (req: ExpressRequest, res: ExpressResponse) => {
    const gene = String(req.query.gene || '').trim();
    const alteration = String(req.query.alteration || req.query.hgvs || '').trim();
    const cdna = String(req.query.cdna || '').trim();
    if (!gene || !alteration) {
      res.status(400).json({ error: 'Provide gene and alteration (e.g. gene=EGFR&alteration=p.L858R)', source: 'vep' });
      return;
    }
    const annotation = await annotateVariantVEP(gene, alteration, cdna);
    res.status(annotation.available ? 200 : 502).json({ ...annotation, attribution: vepAttribution() });
  });

  // 33. Open Targets — alteration -> druggable target -> drugs
  router.get('/external/opentargets/target', async (req: ExpressRequest, res: ExpressResponse) => {
    const gene = String(req.query.gene || '').trim();
    if (!gene) {
      res.status(400).json({ error: 'Provide gene', source: 'opentargets' });
      return;
    }
    const target = await fetchTargetDruggability(gene);
    res.status(target.available ? 200 : 502).json({ ...target, attribution: openTargetsAttribution() });
  });

  // 34. ChEMBL — drug identity, mechanism, metabolism, warnings
  router.get('/external/chembl/drug', async (req: ExpressRequest, res: ExpressResponse) => {
    const name = String(req.query.name || req.query.drug || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Provide name', source: 'chembl' });
      return;
    }
    const profiles = await fetchDrugProfiles([name]);
    res.status(profiles[0]?.resolved ? 200 : 502).json({ ...profiles[0], attribution: chemblAttribution() });
  });

  // 35. Biomarker-matched clinical trials — the server-side unlock
  router.post('/onco-agent/trials/match', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const patientCase = req.body.patientCase as PatientCase;
      if (!patientCase || !patientCase.cancerType) {
        res.status(400).json({ error: 'Valid patientCase object is required' });
        return;
      }
      const cancerType = resolveCancerType(patientCase.cancerType);
      const profile = buildTrialMatchProfile(patientCase, cancerType.name, cancerType.mainType);
      const pageSize = Math.min(Math.max(Number(req.body.pageSize) || 20, 1), 50);
      const matches = await matchTrialsForPatient(patientCase, profile, {
        pageSize,
        requireGeneMatch: req.body.requireGeneMatch === true,
      });
      res.json({ result: matches, resolvedCancerType: cancerType });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trial matching error';
      res.status(500).json({ error: message });
    }
  });

  // 35b. Ad-hoc trial match (no full patient case posted)
  router.get('/onco-agent/trials/match', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const condition = String(req.query.condition || '').trim();
      const genes = String(req.query.genes || '').split(',').map((g) => g.trim()).filter(Boolean);
      if (!condition && genes.length === 0) {
        res.status(400).json({ error: 'Provide condition and/or genes' });
        return;
      }
      const syntheticCase = {
        cancerType: condition || 'Solid Tumor',
        genomicAlterations: genes.map((g) => ({ gene: g, hgvsProtein: '' })),
        biomarkers: {},
        labs: {},
        priorTherapies: [],
      } as unknown as PatientCase;
      const profile = buildTrialMatchProfile(syntheticCase, condition || null, null);
      const matches = await matchTrialsForPatient(syntheticCase, profile, {
        pageSize: Math.min(Math.max(Number(req.query.pageSize) || 20, 1), 50),
      });
      res.json({ result: matches });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trial matching error';
      res.status(500).json({ error: message });
    }
  });

  // 36. Full enrichment for a case — one call, every knowledge source
  router.post('/onco-agent/genomic-enrichment', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
      const patientCase = req.body.patientCase as PatientCase;
      if (!patientCase || !patientCase.cancerType) {
        res.status(400).json({ error: 'Valid patientCase object is required' });
        return;
      }
      const enrichment = await buildGenomicEnrichment(patientCase, { skipCache: req.body.skipCache === true });
      res.json({ enrichment });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Genomic enrichment error';
      res.status(500).json({ error: message });
    }
  });

  router.get('/onco-agent/genomic-knowledge/status', (_req: ExpressRequest, res: ExpressResponse) => {
    res.json({
      oncotree: getOncoTreeStatus(),
      enrichmentCacheEntries: enrichmentCacheSize(),
      upstreams: {
        civic: { endpoint: process.env.CIVIC_GRAPHQL || 'https://civicdb.org/api/graphql' },
        ensembl: { endpoint: process.env.ENSEMBL_REST || 'https://rest.ensembl.org' },
        openTargets: { endpoint: process.env.OPEN_TARGETS_API || 'https://api.platform.opentargets.org/api/v4/graphql' },
        chembl: { endpoint: process.env.CHEMBL_API || 'https://www.ebi.ac.uk/chembl/api/data' },
        clinicalTrials: { endpoint: 'https://clinicaltrials.gov/api/v2' },
      },
    });
  });
}
