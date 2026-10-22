import { Router, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { PatientCase, TumorBoardReport } from '../src/types/oncology';
import {
  runOrchestratedMTBPipeline,
  computeCaseChecksum,
  evaluateGuardrailTripwires,
} from './orchestrator';
import { GovernanceSignOff } from '../src/types/governance';
import {
  resolveDataVolume,
  getRecourseComputeStatus,
  getExternalWetLabSources,
  getKaggleIngestedManifests,
  SURVBOARD_COHORT_SAMPLES,
  submitRecourseJob,
} from './ecosystem';
import { getEcosystemTelemetrySnapshot } from './telemetry';
import { MultiOmicDetectionCore } from './ledger-harmonizer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateLocalOncologyReport, generateLocalChatAnswer, computeReportContentHash } from './local-oncology-engine';
import {
  loadRunFindings,
  reviewRuns,
  THRESHOLDS,
  type GovernanceReview,
  type RunFinding,
} from './research-governor';
import {
  initCohortDb,
  getCohortDbStatus,
  getRegisteredDatasets,
  runCohortQuery,
  getViewSchema,
  getViewSummary,
} from './cohort-db';
import {
  CancerTypeResolution,
  resolveCancerType,
  searchOncoTree,
  getOncoTreeStatus,
  initOncoTree,
  ONCOTREE_ATTRIBUTION,
} from './genomics/oncotree';
import {
  fetchCivicVariantEvidence,
  searchCivicEvidence,
  toCivicMolecularProfile,
  civicAttribution,
} from './genomics/civic';
import { annotateVariantVEP, vepAttribution } from './genomics/vep';
import { fetchTargetDruggability, openTargetsAttribution } from './drugs/opentargets';
import { fetchDrugProfiles, chemblAttribution } from './drugs/chembl';
import {
  buildGenomicEnrichment,
  warmGenomicKnowledge,
  enrichmentCacheSize,
  buildGenomicPromptContext,
  type GenomicEnrichment,
} from './enrichment';
import { buildTrialMatchProfile, matchTrialsForPatient } from './trials/biomarker-matcher';
import { registerGenomicKnowledgeRoutes } from './routes/genomic-knowledge';
import { fetchWithRetry } from './lib/http';

/** Loose accepted shape for a posted finding; normalized before gating. */
type RunFindingInput = Partial<RunFinding> & { lane: string };
function normalizeFinding(f: RunFindingInput): RunFinding {
  return {
    lane: String(f.lane ?? ''),
    title: f.title ?? String(f.lane ?? ''),
    datasets: f.datasets ?? [],
    ok: f.ok === true,
    interpretation: f.interpretation ?? '',
    envelope: f.envelope ?? {},
    source: f.source ?? 'posted',
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cached OncoKB gene list from local open-source dataset (1,247 curated genes)
let oncokbGenesCache: any[] = [];
try {
  const oncokbPath = path.resolve(__dirname, '../../oncokb-attention/data/raw/oncokb/cancerGeneList.json');
  if (fs.existsSync(oncokbPath)) {
    oncokbGenesCache = JSON.parse(fs.readFileSync(oncokbPath, 'utf-8'));
  }
} catch (err) {
  console.warn('Failed to load local OncoKB dataset:', err);
}

// Cached Landmark Trial Publications from local CSV datasets
export interface LandmarkTrialRecord {
  trial: string;
  publicationType: string;
  title: string;
  firstAuthor: string;
  journal: string;
  year: string;
  pmid: string;
  pmcid?: string;
  doi?: string;
  biomarkersAnalyzed: string;
  keyFinding: string;
}

let landmarkTrialsCache: LandmarkTrialRecord[] = [];
try {
  const parseCsvLines = (filePath: string) => {
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, 'utf-8');
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length <= 1) return [];
    const rows: LandmarkTrialRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length >= 6) {
        rows.push({
          trial: cols[0],
          publicationType: cols[1],
          title: cols[2],
          firstAuthor: cols[3],
          journal: cols[4],
          year: cols[5],
          pmid: cols[6] || 'N/A',
          pmcid: cols[7],
          doi: cols[8],
          biomarkersAnalyzed: cols[10] || '',
          keyFinding: cols[11] || '',
        });
      }
    }
    return rows;
  };

  const p1 = path.resolve(__dirname, '../../new-tools/key_publications.csv');
  const p2 = path.resolve(__dirname, '../../new-tools/key_publications_parp_hrd.csv');
  landmarkTrialsCache = [...parseCsvLines(p1), ...parseCsvLines(p2)];
} catch (err) {
  console.warn('Failed to load local landmark trials dataset:', err);
}

// Kick the ontology load off at boot so the first request already sees live data.
warmGenomicKnowledge();

export const apiRouter = Router();

registerGenomicKnowledgeRoutes(apiRouter);

const detectionCore = new MultiOmicDetectionCore();

// In-memory governance audit trail
const governanceAuditTrail: GovernanceSignOff[] = [];

// Initialize Google GenAI on the server
const getAiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// Retry/backoff for scientific APIs lives in ./lib/http (shared by every external route).

// Resilient Gemini runner with automatic retry on 503/429 and model cascade
async function callGeminiWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction?: string;
    responseMimeType?: string;
  }
): Promise<{ text: string; modelUsed: string }> {
  // Cascades starting with gemini-3.5-flash (high availability & sub-3s latency)
  // then gemini-3.8-flash, then gemini-3.1-flash-lite
  const models = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.1-flash-lite'];
  let lastError: unknown = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        };
        if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
        if (params.responseMimeType) config.responseMimeType = params.responseMimeType;

        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        if (response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('high demand') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('RESOURCE_EXHAUSTED');

        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }
        break; // try next model in cascade
      }
    }
  }

  throw lastError || new Error('All Gemini models in cascade failed');
}

// 1. Health check
apiRouter.get('/health', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({
    status: 'ok',
    service: 'Onco Agent Precision Oncology Engine',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

// 2. ClinVar Live Query
apiRouter.get('/external/clinvar', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const gene = String(req.query.gene || '').trim();
    const variant = String(req.query.variant || '').trim();
    if (!gene && !variant) {
      res.status(400).json({ error: 'Missing gene or variant parameter' });
      return;
    }

    const queryTerm = `${gene} ${variant}`.trim();
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=clinvar&term=${encodeURIComponent(
      queryTerm
    )}&retmode=json&retmax=6`;

    const searchRes = await fetchWithRetry(searchUrl, {
      headers: { 'User-Agent': 'OncoAgent/1.0 (bioinformatics-clinvar)' },
    });

    if (!searchRes.ok) {
      res.status(searchRes.status).json({ error: 'ClinVar search failed' });
      return;
    }

    const searchData = await searchRes.json();
    const idList: string[] = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) {
      res.json({ results: [], total: 0 });
      return;
    }

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=clinvar&id=${idList.join(
      ','
    )}&retmode=json`;
    const summaryRes = await fetchWithRetry(summaryUrl, {
      headers: { 'User-Agent': 'OncoAgent/1.0 (bioinformatics-clinvar)' },
    });

    if (!summaryRes.ok) {
      res.status(summaryRes.status).json({ error: 'ClinVar summary failed' });
      return;
    }

    const summaryData = await summaryRes.json();
    const uids: string[] = summaryData.result?.uids || [];
    const results = uids.map((uid) => {
      const item = summaryData.result[uid];
      const germlineDesc = item?.germline_classification?.description || '';
      const clinicalDesc = item?.clinical_impact_classification?.description || germlineDesc || 'Uncertain significance';
      const reviewStatus = item?.germline_classification?.review_status || item?.clinical_impact_classification?.review_status || 'no assertion criteria provided';

      let stars = 0;
      if (reviewStatus.includes('practice guideline')) stars = 4;
      else if (reviewStatus.includes('expert panel')) stars = 3;
      else if (reviewStatus.includes('multiple submitters') && !reviewStatus.includes('conflicts')) stars = 2;
      else if (reviewStatus.includes('single submitter') || reviewStatus.includes('conflicting')) stars = 1;

      const traits: string[] = Array.isArray(item?.trait_set)
        ? item.trait_set.map((t: { trait_name?: string }) => t.trait_name || '').filter(Boolean)
        : [];

      return {
        variationId: uid,
        title: item?.title || `${gene} alteration`,
        gene: item?.genes?.[0]?.symbol || gene,
        clinicalSignificance: clinicalDesc,
        reviewStatus,
        stars,
        conditions: traits.slice(0, 4),
        lastEvaluated: item?.germline_classification?.last_evaluated,
        accession: item?.accession,
        ncbiUrl: `https://www.ncbi.nlm.nih.gov/clinvar/variation/${uid}/`,
      };
    });

    res.json({ results, total: results.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown ClinVar error';
    res.status(500).json({ error: message });
  }
});

// 3. ClinicalTrials.gov REST API v2 Live Query
apiRouter.get('/external/trials', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const condition = String(req.query.condition || '').trim();
    const intervention = String(req.query.intervention || '').trim();
    const status = String(req.query.status || 'RECRUITING,ACTIVE_NOT_RECRUITING').trim();
    const pageSize = Math.min(Number(req.query.pageSize || 10), 20);

    const params = new URLSearchParams();
    if (condition) params.set('query.cond', condition);
    if (intervention) params.set('query.intr', intervention);
    params.set('filter.overallStatus', status);
    params.set(
      'fields',
      'NCTId,BriefTitle,OverallStatus,Phase,ConditionsModule,ArmsInterventionsModule,EligibilityModule,DescriptionModule'
    );
    params.set('pageSize', String(pageSize));
    params.set('countTotal', 'true');

    const trialsUrl = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
    const trialsRes = await fetchWithRetry(trialsUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OncoAgent/1.0 (bioinformatics-clinicaltrials)',
      },
    });

    if (!trialsRes.ok) {
      res.status(trialsRes.status).json({ error: 'ClinicalTrials.gov query failed' });
      return;
    }

    const data = await trialsRes.json();
    const studies = (data.studies || []).map((study: any) => {
      const p = study.protocolSection || {};
      const idMod = p.identificationModule || {};
      const statusMod = p.statusModule || {};
      const designMod = p.designModule || {};
      const condMod = p.conditionsModule || {};
      const armsMod = p.armsInterventionsModule || {};
      const descMod = p.descriptionModule || {};
      const eligMod = p.eligibilityModule || {};

      const nctId = idMod.nctId || '';
      const briefTitle = idMod.briefTitle || 'Untitled Study';
      const phases = designMod.phases || [];
      const phaseStr = Array.isArray(phases) && phases.length > 0 ? phases.join(', ') : 'Not Applicable';

      const interventions: string[] = Array.isArray(armsMod.interventions)
        ? armsMod.interventions.map((intr: { name?: string }) => intr.name || '').filter(Boolean)
        : [];

      return {
        nctId,
        briefTitle,
        overallStatus: statusMod.overallStatus || 'UNKNOWN',
        phase: phaseStr,
        conditions: condMod.conditions || [],
        interventions: interventions.slice(0, 6),
        briefSummary: descMod.briefSummary || '',
        eligibilitySnippet: eligMod.eligibilityCriteria
          ? eligMod.eligibilityCriteria.slice(0, 350) + '...'
          : undefined,
        url: `https://clinicaltrials.gov/study/${nctId}`,
      };
    });

    res.json({
      totalCount: data.totalCount || studies.length,
      studies,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'ClinicalTrials.gov query error';
    res.status(500).json({ error: message });
  }
});

// 4. NCBI PubMed E-utilities Live Query
apiRouter.get('/external/pubmed', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const term = String(req.query.term || '').trim();
    if (!term) {
      res.status(400).json({ error: 'Missing term query parameter' });
      return;
    }

    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
      term
    )}&retmode=json&retmax=6&sort=pub_date`;

    const searchRes = await fetchWithRetry(searchUrl, {
      headers: { 'User-Agent': 'OncoAgent/1.0 (bioinformatics-pubmed)' },
    });

    if (!searchRes.ok) {
      res.status(searchRes.status).json({ error: 'PubMed search failed' });
      return;
    }

    const searchData = await searchRes.json();
    const idList: string[] = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) {
      res.json({ articles: [], total: 0 });
      return;
    }

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${idList.join(
      ','
    )}&retmode=json`;
    const summaryRes = await fetchWithRetry(summaryUrl, {
      headers: { 'User-Agent': 'OncoAgent/1.0 (bioinformatics-pubmed)' },
    });

    if (!summaryRes.ok) {
      res.status(summaryRes.status).json({ error: 'PubMed summary failed' });
      return;
    }

    const summaryData = await summaryRes.json();
    const uids: string[] = summaryData.result?.uids || [];
    const articles = uids.map((uid) => {
      const item = summaryData.result[uid];
      const authors = Array.isArray(item?.authors)
        ? item.authors.map((a: { name?: string }) => a.name || '').filter(Boolean)
        : [];

      return {
        pmid: uid,
        title: item?.title || 'Untitled Article',
        journal: item?.source || item?.fulljournalname || 'Journal',
        pubDate: item?.pubdate || '',
        authors: authors.slice(0, 4),
        doi: item?.articleids?.find((x: { idtype?: string }) => x.idtype === 'doi')?.value,
        url: `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
      };
    });

    res.json({ articles, total: articles.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'PubMed query error';
    res.status(500).json({ error: message });
  }
});

// 5. Ensembl Gene Annotation Query
apiRouter.get('/external/ensembl', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const gene = String(req.query.gene || '').trim();
    if (!gene) {
      res.status(400).json({ error: 'Missing gene parameter' });
      return;
    }

    const url = `https://rest.ensembl.org/lookup/symbol/homo_sapiens/${encodeURIComponent(
      gene
    )}?expand=1;content-type=application/json`;
    const response = await fetchWithRetry(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OncoAgent/1.0 (bioinformatics-ensembl)',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Ensembl lookup failed for ${gene}` });
      return;
    }

    const data = await response.json();
    res.json({
      gene: data.display_name || gene,
      id: data.id,
      biotype: data.biotype,
      chromosome: data.seq_region_name,
      start: data.start,
      end: data.end,
      strand: data.strand === 1 ? '+' : '-',
      canonicalTranscript: data.canonical_transcript,
      description: data.description,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ensembl lookup error';
    res.status(500).json({ error: message });
  }
});

// 6. Gemini Precision Oncology Synthesis Engine
apiRouter.post('/onco-agent/analyze', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const patientCase = req.body.patientCase as PatientCase;
    if (!patientCase || !patientCase.cancerType) {
      res.status(400).json({ error: 'Valid patientCase object is required' });
      return;
    }

    const ai = getAiClient();

    // Layer 1 + Layer 2 knowledge: OncoTree identity, CIViC evidence, VEP
    // consequence, Open Targets druggability, ChEMBL drug profiles and the
    // biomarker-ranked trial shortlist. Best-effort; a dead upstream leaves the
    // relevant slice unavailable and never blocks the report.
    let enrichment: GenomicEnrichment | undefined;
    try {
      enrichment = await buildGenomicEnrichment(patientCase);
    } catch {
      enrichment = undefined;
    }

    const genomicContext = enrichment ? buildGenomicPromptContext(enrichment) : 'Genomic enrichment unavailable this run.';

    if (!ai) {
      const report = generateLocalOncologyReport(patientCase, enrichment);
      res.json({ report });
      return;
    }

    const alterationsList = patientCase.genomicAlterations
      .map(
        (a) =>
          `- ${a.gene} ${a.hgvsProtein} (${a.variantType}, VAF: ${a.vafPercent}%, Depth: ${a.readDepth || 'N/A'}x, ClinVar: ${
            a.clinVarSignificance || 'N/A'
          }, Tier: ${a.tier}) [${a.actionabilityNote || 'No specific note'}]`
      )
      .join('\n');

    const priorsList =
      patientCase.priorTherapies.length > 0
        ? patientCase.priorTherapies
            .map(
              (p) =>
                `- ${p.regimen} in ${p.setting} for ${p.durationMonths} mo (Best response: ${p.bestResponse}). Notes: ${
                  p.notes || 'None'
                }`
            )
            .join('\n')
        : 'None (Treatment Naive)';

    const prompt = `You are Onco Agent, an advanced Precision Oncology and Molecular Tumor Board reasoning engine.
Analyze the following clinical oncology dossier and produce a comprehensive, publication-grade tumor board consensus report in strict JSON format.

PATIENT CLINICAL DOSSIER:
- Reference ID: ${patientCase.patientRef}
- Age: ${patientCase.age} | Biological Sex: ${patientCase.sex}
- Primary Malignancy: ${patientCase.cancerType}
- Histology: ${patientCase.histology}
- Clinical/Pathologic Stage: ${patientCase.stage}
- ECOG Performance Status: ${patientCase.ecogScore}
- Line of Therapy: ${patientCase.lineOfTherapy}
- Smoking History: ${patientCase.smokingStatus}
- Prior Systemic Therapies:
${priorsList}

SOMATIC GENOMIC ALTERATIONS:
${alterationsList || 'No somatic mutations detected'}

BIOMARKERS & IMMUNOPHENOTYPING:
- Microsatellite Instability: ${patientCase.biomarkers.msiStatus}
- Tumor Mutation Burden (TMB): ${patientCase.biomarkers.tmbMutMb ?? 'Not measured'} mut/Mb
- PD-L1 Expression: ${patientCase.biomarkers.pdL1TpsPercent ?? 'Not measured'}% TPS (CPS: ${
      patientCase.biomarkers.pdL1CpsScore ?? 'N/A'
    })
- Homologous Recombination Deficiency (HRD): ${patientCase.biomarkers.hrdStatus ?? 'Not measured'}

LABORATORY & ORGAN PROFILE:
- eGFR: ${patientCase.labs.eGfr ?? 'N/A'} mL/min/1.73m2 | Bilirubin: ${patientCase.labs.totalBilirubin ?? 'N/A'} mg/dL
- AST/ALT: ${patientCase.labs.ast ?? 'N/A'} / ${patientCase.labs.alt ?? 'N/A'} U/L
- ANC: ${patientCase.labs.anc ?? 'N/A'} x10^9/L | Platelets: ${patientCase.labs.platelets ?? 'N/A'} x10^9/L | Hb: ${
      patientCase.labs.hemoglobin ?? 'N/A'
    } g/dL
- Baseline QTc: ${patientCase.labs.qtcIntervalMs ?? 'N/A'} ms
- Clinical Case Notes: ${patientCase.clinicalNotes || 'None'}

INSTRUCTIONS & SCIENTIFIC REQUIREMENTS:
1. Executive Summary: Synthesize the driver biology, mechanism of disease progression, and priority therapeutic directive concisely.
2. Molecular Drivers: Classify each alteration according to functional consequences (activating kinase, loss-of-function tumor suppressor, gatekeeper resistance) and AMP/ASCO/CAP level.
3. Resistance Mechanism Analysis: Detail known steric or pathway resistance mechanisms (e.g. secondary mutations, bypass signaling via MET/ERBB2/PI3K, histologic transformation, immune evasion).
4. Recommended Regimens: Provide prioritized therapeutic options:
   - Category: "Tier 1 Standard of Care", "Tier 2 Emerging / Off-Label", or "Clinical Trial Prioritized"
   - Evidence level (Level A: FDA approved Phase 3; Level B: Phase 2/prospective; Level C: Preclinical/case series)
   - Mechanistic rationale linking drugs to specific patient mutations
   - Supporting landmark trial names / PMIDs (e.g., FLAURA, AURA3, CodeBreaK 200, KRYSTAL-1, SOLO-1, CheckMate 067, KEYNOTE-189, etc.)
   - Specific laboratory and toxicity monitoring steps
5. Toxicity & DDI Alerts: Identify serious organ/metabolic contraindications, drug interactions, or organ adjustment requirements based on patient labs and medications.
6. Immunotherapy Assessment: Evaluate likelihood of immune checkpoint inhibitor benefit based on MSI-H, TMB, PD-L1, and co-mutations (e.g., STK11/KEAP1/EGFR causing cold tumors).
7. Next Steps: Concrete actionable clinical tasks (e.g., reflex testing, baseline imaging, ctDNA kinetics, clinical trial screening).

Format your output as valid JSON matching this schema:
{
  "executiveSummary": "string",
  "molecularDrivers": [
    {
      "gene": "string",
      "alteration": "string",
      "functionalConsequence": "string",
      "actionabilityLevel": "string"
    }
  ],
  "resistanceMechanismAnalysis": {
    "identifiedMechanisms": ["string"],
    "bypassCircuits": ["string"],
    "overcomingStrategies": "string"
  },
  "recommendedRegimens": [
    {
      "name": "string",
      "category": "Tier 1 Standard of Care" | "Tier 2 Emerging / Off-Label" | "Clinical Trial Prioritized",
      "evidenceLevel": "Level A (FDA Approved / Phase 3)" | "Level B (Phase 2 / Well-Powered)" | "Level C (Preclinical / Case Series)",
      "rationale": "string",
      "targetMechanism": "string",
      "supportingTrialsOrPMIDs": ["string"],
      "monitoringGuidance": ["string"]
    }
  ],
  "toxicityAndDDI": [
    {
      "severity": "High" | "Moderate" | "Low",
      "title": "string",
      "mechanism": "string",
      "management": "string"
    }
  ],
  "immunotherapyAssessment": {
    "candidacy": "Strong Candidate" | "Intermediate / Biomarker Dependent" | "Low Likelihood of Benefit / Contraindicated",
    "biomarkerRationale": "string"
  },
  "nextSteps": ["string"],
  "scientificDisclaimer": "string"
}`;

    const { text, modelUsed } = await callGeminiWithFallback(ai, {
      contents: prompt,
      systemInstruction:
        'You are an authoritative oncologist, molecular pathologist, and clinical trial matching specialist. Provide strictly evidence-based, medically rigorous analysis without speculative fluff. Respond strictly in valid JSON.',
      responseMimeType: 'application/json',
    });

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback extraction
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse Gemini oncology JSON response');
      }
    }

    const report: TumorBoardReport = {
      timestamp: new Date().toISOString(),
      contentHash: '',
      caseId: patientCase.id,
      executiveSummary: parsed.executiveSummary || 'Synthesis completed.',
      molecularDrivers: parsed.molecularDrivers || [],
      resistanceMechanismAnalysis: parsed.resistanceMechanismAnalysis || {
        identifiedMechanisms: [],
        bypassCircuits: [],
        overcomingStrategies: '',
      },
      recommendedRegimens: parsed.recommendedRegimens || [],
      toxicityAndDDI: parsed.toxicityAndDDI || [],
      immunotherapyAssessment: parsed.immunotherapyAssessment || {
        candidacy: 'Intermediate / Biomarker Dependent',
        biomarkerRationale: 'Assessment evaluated.',
      },
      nextSteps: parsed.nextSteps || [],
      scientificDisclaimer:
        parsed.scientificDisclaimer ||
        `For clinical decision support and molecular tumor board research discussion only (synthesized via ${modelUsed}). Not a substitute for formal multidisciplinary clinical diagnosis or treatment prescription.`,
    };

    // Deterministic hash over clinical substance only, so two runs over the same
    // case are comparable despite the wall-clock timestamp.
    report.contentHash = computeReportContentHash({
      ...report,
      timestamp: undefined,
      contentHash: undefined,
      genomicKnowledge: undefined,
    });

    res.json({ report });
  } catch (err: unknown) {
    console.warn('Gemini analysis failed, falling back to Local Precision Oncology Rule Engine:', err);
    try {
      const patientCase = req.body.patientCase as PatientCase;
      const fallbackReport = generateLocalOncologyReport(patientCase);
      res.json({ report: fallbackReport });
    } catch (fallbackErr) {
      const message = err instanceof Error ? err.message : 'Analysis synthesis error';
      res.status(500).json({ error: message });
    }
  }
});

// 7. Interactive Tumor Board Q&A
apiRouter.post('/onco-agent/chat', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { patientCase, query, history } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Missing query parameter' });
      return;
    }

    const ai = getAiClient();
    if (!ai) {
      const answer = generateLocalChatAnswer(patientCase, query);
      res.json({ answer });
      return;
    }

    const systemContext = `You are Onco Agent, an interactive Molecular Tumor Board expert.
You are discussing patient ${patientCase?.patientRef || 'current case'} with an oncology clinician.
Patient Profile:
- Diagnosis: ${patientCase?.cancerType || 'Not specified'} (${patientCase?.histology || ''})
- Stage: ${patientCase?.stage || 'Unknown'} | ECOG: ${patientCase?.ecogScore ?? 'N/A'}
- Genomic Alterations: ${(patientCase?.genomicAlterations || [])
      .map((a: any) => `${a.gene} ${a.hgvsProtein} (${a.variantType}, VAF ${a.vafPercent}%)`)
      .join(', ')}
- Biomarkers: MSI ${patientCase?.biomarkers?.msiStatus || 'N/A'}, TMB ${
      patientCase?.biomarkers?.tmbMutMb ?? 'N/A'
    } mut/Mb, PD-L1 ${patientCase?.biomarkers?.pdL1TpsPercent ?? 'N/A'}% TPS, HRD ${
      patientCase?.biomarkers?.hrdStatus || 'N/A'
    }
- Prior lines: ${(patientCase?.priorTherapies || []).map((p: any) => p.regimen).join(' -> ') || 'None'}

Provide precise, evidence-grounded answers citing relevant trial data (e.g. Phase 3 trials, ASCO/ESMO/NCCN guidelines), mechanisms of action, pharmacokinetics, or toxicity management where appropriate. Keep answers concise, clinically focused, and structured.`;

    const chatMessages: string[] = [];
    if (Array.isArray(history)) {
      for (const msg of history.slice(-6)) {
        chatMessages.push(`${msg.role === 'user' ? 'Clinician' : 'Onco Agent'}: ${msg.content}`);
      }
    }
    chatMessages.push(`Clinician: ${query}`);

    const prompt = `${systemContext}\n\nCONVERSATION HISTORY:\n${chatMessages.join(
      '\n'
    )}\n\nOnco Agent response:`;

    const { text } = await callGeminiWithFallback(ai, {
      contents: prompt,
    });

    res.json({ answer: text || '' });
  } catch (err: unknown) {
    console.warn('Chat error, using local clinical reasoning response:', err);
    try {
      const { patientCase, query } = req.body;
      const answer = generateLocalChatAnswer(patientCase, query || '');
      res.json({ answer });
    } catch {
      const message = err instanceof Error ? err.message : 'Chat processing error';
      res.status(500).json({ error: message });
    }
  }
});

// 8. Multi-Agent Orchestration Pipeline
apiRouter.post('/onco-agent/orchestrate', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const patientCase = req.body.patientCase as PatientCase;
    if (!patientCase || !patientCase.cancerType) {
      res.status(400).json({ error: 'Valid patientCase object is required' });
      return;
    }

    const ai = getAiClient();
    const result = await runOrchestratedMTBPipeline(ai as any, patientCase);
    res.json({ result });
  } catch (err: unknown) {
    console.warn('Orchestration pipeline execution error, falling back to local deterministic pipeline:', err);
    try {
      const patientCase = req.body.patientCase as PatientCase;
      const result = await runOrchestratedMTBPipeline(null as any, patientCase);
      res.json({ result });
    } catch (fallbackErr) {
      const message = err instanceof Error ? err.message : 'Orchestration pipeline failed';
      res.status(500).json({ error: message });
    }
  }
});

// 9. Governance & Guardrail Checks (Quick Pre-Flight)
apiRouter.post('/onco-agent/governance/pre-flight', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const patientCase = req.body.patientCase as PatientCase;
    if (!patientCase) {
      res.status(400).json({ error: 'Patient case required' });
      return;
    }
    const checksum = computeCaseChecksum(patientCase);
    const checks = evaluateGuardrailTripwires(patientCase);
    res.json({ checksum, checks });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pre-flight check error';
    res.status(500).json({ error: message });
  }
});

// 10. Human-in-the-Loop (HITL) Formal Clinical Sign-Off
apiRouter.post('/onco-agent/governance/sign-off', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const {
      caseId,
      patientCase,
      reviewerName,
      reviewerRole,
      institution,
      decision,
      clinicalRationale,
      concurrenceWithAiReport,
      overriddenRecommendations,
    } = req.body;

    if (!caseId || !reviewerName || !reviewerRole || !decision) {
      res.status(400).json({ error: 'Missing required sign-off audit fields' });
      return;
    }

    const caseChecksum = patientCase ? computeCaseChecksum(patientCase) : req.body.caseChecksum || 'UNKNOWN';
    const timestamp = new Date().toISOString();

    const signaturePayload = `${caseId}|${caseChecksum}|${reviewerName}|${reviewerRole}|${decision}|${timestamp}`;
    const verificationHash = crypto.createHash('sha256').update(signaturePayload).digest('hex');

    const signOffRecord: GovernanceSignOff = {
      signOffId: `sig-${Date.now()}`,
      caseId,
      caseChecksum,
      reviewerName,
      reviewerRole,
      institution: institution || 'Academic Medical Center MTB',
      decision,
      clinicalRationale: clinicalRationale || '',
      concurrenceWithAiReport: Boolean(concurrenceWithAiReport),
      overriddenRecommendations: overriddenRecommendations || [],
      timestamp,
      verificationHash,
    };

    governanceAuditTrail.unshift(signOffRecord);
    res.json({ success: true, record: signOffRecord });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign-off registration error';
    res.status(500).json({ error: message });
  }
});

// 11. Governance Audit Trail List & Case Integrity Verification
apiRouter.get('/onco-agent/governance/audit-trail', (req: ExpressRequest, res: ExpressResponse) => {
  const caseId = req.query.caseId as string | undefined;
  const filtered = caseId
    ? governanceAuditTrail.filter((r) => r.caseId === caseId)
    : governanceAuditTrail;
  res.json({ auditTrail: filtered });
});

// 11b. ECO-SYSTEM GOVERNOR — the same gate discipline applied to the research pipeline.
// Reads every lane's __RECOURSE_RESULT__ envelope, gates it, and decides what is
// allowed to inform the next batch. Deterministic: no model call, so a verdict
// never depends on an LLM being up.
const runReviewCache = new Map<string, GovernanceReview>();

apiRouter.post('/onco-agent/ecosystem/govern/review', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { findings } = req.body as { findings?: RunFindingInput[] };
    const source = findings && findings.length ? findings.map(normalizeFinding) : loadRunFindings();
    if (!source.length) {
      res.status(400).json({ error: 'No run findings available (research-data.json missing and no findings posted)' });
      return;
    }
    const review = reviewRuns(source);
    runReviewCache.set(review.reviewedAt, review);
    res.json({ review });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Governor review error';
    res.status(500).json({ error: message });
  }
});

apiRouter.get('/onco-agent/ecosystem/govern/agenda', (_req: ExpressRequest, res: ExpressResponse) => {
  try {
    const latest = [...runReviewCache.values()].pop();
    const review = latest ?? reviewRuns(loadRunFindings());
    if (!latest) runReviewCache.set(review.reviewedAt, review);
    res.json({
      reviewedAt: review.reviewedAt,
      thresholds: THRESHOLDS,
      promoted: review.promoted,
      refused: review.refused,
      insights: review.insights,
      nextBatch: review.nextBatch,
      priorBatch: review.priorBatch,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Agenda error';
    res.status(500).json({ error: message });
  }
});

apiRouter.get('/onco-agent/ecosystem/govern/audit-trail', (_req: ExpressRequest, res: ExpressResponse) => {
  const trail = [...runReviewCache.values()].map((r) => ({
    reviewedAt: r.reviewedAt,
    totalFindings: r.totalFindings,
    promoted: r.promoted,
    refused: r.refused,
  }));
  res.json({ trail });
});

// 11c. Governance sign-off for a RUN (reuses the existing HITL audit trail shape).
apiRouter.post('/onco-agent/ecosystem/govern/sign-off', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { lane, decision, reviewerName, clinicalRationale } = req.body as {
      lane?: string; decision?: string; reviewerName?: string; clinicalRationale?: string;
    };
    if (!lane || !decision || !reviewerName) {
      res.status(400).json({ error: 'Missing lane, decision or reviewerName' });
      return;
    }
    const timestamp = new Date().toISOString();
    const verificationHash = crypto
      .createHash('sha256')
      .update(`RUN|${lane}|${reviewerName}|${decision}|${timestamp}`)
      .digest('hex');
    const record: GovernanceSignOff = {
      signOffId: `run-${Date.now()}`,
      caseId: `lane:${lane}`,
      caseChecksum: verificationHash.slice(0, 16),
      reviewerName,
      reviewerRole: 'MTB Committee Chair',
      institution: 'Overlay365 Research Governance',
      decision: decision === 'APPROVED_WITH_MODIFICATIONS' ? 'APPROVED_WITH_MODIFICATIONS'
        : decision === 'REJECTED_INSUFFICIENT_EVIDENCE' ? 'REJECTED_INSUFFICIENT_EVIDENCE'
        : 'APPROVED_FOR_CLINICAL_DISCUSS',
      clinicalRationale: clinicalRationale || '',
      concurrenceWithAiReport: false,
      timestamp,
      verificationHash,
    };
    governanceAuditTrail.unshift(record);
    res.json({ success: true, record });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Run sign-off error';
    res.status(500).json({ error: message });
  }
});

// 12. Ecosystem Health, Data Volume (0x466A5450) & Recourse Compute Status
apiRouter.get('/ecosystem/status', (_req: ExpressRequest, res: ExpressResponse) => {
  const volume = resolveDataVolume();
  const computePlatforms = getRecourseComputeStatus();
  const wetLabSources = getExternalWetLabSources();

  res.json({
    timestamp: new Date().toISOString(),
    dataVolume: volume,
    computePlatforms,
    wetLabSources,
  });
});

// 13. Ingested Kaggle Dataset Manifests
apiRouter.get('/ecosystem/kaggle-manifests', (_req: ExpressRequest, res: ExpressResponse) => {
  const manifests = getKaggleIngestedManifests();
  res.json({ manifests });
});

// 14. SurvBoard TCGA Multi-Modal Benchmark Cohorts
apiRouter.get('/ecosystem/survboard/cohorts', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ cohorts: SURVBOARD_COHORT_SAMPLES });
});

// 15. Recourse Compute Job Dispatch & Envelope Parser
apiRouter.post('/ecosystem/recourse/submit', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { experimentId, hardware } = req.body;
    if (!experimentId) {
      res.status(400).json({ error: 'Missing experimentId' });
      return;
    }
    const submission = submitRecourseJob(
      String(experimentId),
      (hardware as 'cpu' | 'gpu' | 'tpu') || 'cpu'
    );
    res.json({ submission });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Recourse dispatch error';
    res.status(500).json({ error: message });
  }
});

// 16. Deep Ecosystem Telemetry & Quota/Observability Snapshot
apiRouter.get('/ecosystem/telemetry', (_req: ExpressRequest, res: ExpressResponse) => {
  const snapshot = getEcosystemTelemetrySnapshot();
  res.json({ snapshot });
});

// 17. Wet-Lab Ledger Harmonized Cohort Priors
apiRouter.get('/ecosystem/harmonized-priors', (_req: ExpressRequest, res: ExpressResponse) => {
  res.json({ priors: detectionCore.getPriors() });
});

// 18. Live Multi-Agent Detection Core Anomaly Scoring
apiRouter.post('/ecosystem/detection/score', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const patientCase = req.body.patientCase as PatientCase;
    if (!patientCase || !patientCase.cancerType) {
      res.status(400).json({ error: 'Valid patientCase object is required' });
      return;
    }
    const detectionResponse = detectionCore.runDetectionPipeline(patientCase);
    res.json({ result: detectionResponse });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Detection scoring error';
    res.status(500).json({ error: message });
  }
});

// 19. Curated OncoKB Cancer Gene Classification (1,247 Genes)
apiRouter.get('/external/oncokb', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const geneQuery = String(req.query.gene || '').trim().toUpperCase();
    if (!geneQuery) {
      res.json({
        totalCuratedGenes: oncokbGenesCache.length,
        sampleGenes: oncokbGenesCache.slice(0, 25).map((g) => ({
          gene: g.hugoSymbol,
          geneType: g.geneType,
          oncokbAnnotated: g.oncokbAnnotated,
          mSKImpact: g.mSKImpact,
        })),
      });
      return;
    }

    const found = oncokbGenesCache.find(
      (g) =>
        g.hugoSymbol.toUpperCase() === geneQuery ||
        (Array.isArray(g.geneAliases) && g.geneAliases.some((a: string) => a.toUpperCase() === geneQuery))
    );

    if (!found) {
      res.json({ found: false, gene: geneQuery });
      return;
    }

    res.json({
      found: true,
      gene: found.hugoSymbol,
      geneType: found.geneType,
      entrezGeneId: found.entrezGeneId,
      oncokbAnnotated: found.oncokbAnnotated,
      grch37Isoform: found.grch37Isoform,
      grch37RefSeq: found.grch37RefSeq,
      grch38Isoform: found.grch38Isoform,
      grch38RefSeq: found.grch38RefSeq,
      mSKImpact: Boolean(found.mSKImpact),
      mSKHeme: Boolean(found.mSKHeme),
      foundation: Boolean(found.foundation),
      vogelstein: Boolean(found.vogelstein),
      sangerCGC: Boolean(found.sangerCGC),
      aliases: found.geneAliases || [],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OncoKB query error';
    res.status(500).json({ error: message });
  }
});

// 20. Curated Landmark Oncology Trial Publications (KEYNOTE, CheckMate, SOLO, OlympiA)
apiRouter.get('/external/landmark-trials', (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const term = String(req.query.term || req.query.gene || req.query.cancerType || '').trim().toLowerCase();
    let filtered = landmarkTrialsCache;
    if (term) {
      filtered = landmarkTrialsCache.filter(
        (t) =>
          t.trial.toLowerCase().includes(term) ||
          t.title.toLowerCase().includes(term) ||
          t.biomarkersAnalyzed.toLowerCase().includes(term) ||
          t.keyFinding.toLowerCase().includes(term)
      );
    }
    res.json({
      total: filtered.length,
      trials: filtered,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Landmark trials query error';
    res.status(500).json({ error: message });
  }
});

// 21. OnCo — public cited oncology knowledge graph (JSON API; code MIT, data CC BY-NC 4.0)
const ONCO_ATTRIBUTION = 'Data from OnCo (onco.cc), CC BY-NC 4.0; commercial use needs a licence';
apiRouter.get('/external/onco', async (req: ExpressRequest, res: ExpressResponse) => {
  const base = (process.env.ONCO_API || 'https://onco.cc/api/v1').replace(/\/+$/, '');
  const q = String(req.query.q || '').trim();
  const id = String(req.query.id || '').trim();
  try {
    const url = id
      ? `${base}/entities/${encodeURIComponent(id)}.json`
      : `${base}/search.json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response: globalThis.Response;
    try {
      response = await fetchWithRetry(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'OncoNo-Agent/1.0' },
        timeoutMs: 8000,
      });
      clearTimeout(timeout);
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
    if (!response.ok) {
      res.status(502).json({ available: false, source: 'onco.cc', error: `OnCo responded ${response.status}`, attribution: ONCO_ATTRIBUTION });
      return;
    }
    const data = (await response.json()) as unknown;
    if (q && !id && Array.isArray(data)) {
      const needle = q.toLowerCase();
      const hits = (data as Array<Record<string, unknown>>)
        .filter((doc) => JSON.stringify(doc).toLowerCase().includes(needle))
        .slice(0, 20);
      res.json({ available: true, query: q, total: hits.length, hits, attribution: ONCO_ATTRIBUTION });
      return;
    }
    res.json({ available: true, data, attribution: ONCO_ATTRIBUTION });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OnCo query error';
    res.status(502).json({ available: false, source: 'onco.cc', error: message, attribution: ONCO_ATTRIBUTION });
  }
});

// 22. CIViC — somatic-variant clinical evidence (capability of the genomics-mcp CIViC server)
apiRouter.get('/external/civic', async (req: ExpressRequest, res: ExpressResponse) => {
  const endpoint = process.env.CIVIC_GRAPHQL || 'https://civicdb.org/api/graphql';
  const profile = String(req.query.query || req.query.molecularProfile || '').trim();
  const disease = String(req.query.disease || '').trim();
  const therapy = String(req.query.therapy || '').trim();
  const level = String(req.query.level || '').trim().toUpperCase();
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  if (level && !['A', 'B', 'C', 'D', 'E'].includes(level)) {
    res.status(400).json({ error: 'level must be one of A, B, C, D, E', source: 'civic' });
    return;
  }
  if (!profile && !disease && !therapy) {
    res.status(400).json({ error: 'Provide at least one of query (molecular profile), disease, therapy', source: 'civic', endpoint });
    return;
  }
  const args = [`first: ${limit}`];
  if (profile) args.push(`molecularProfileName: ${JSON.stringify(profile)}`);
  if (disease) args.push(`diseaseName: ${JSON.stringify(disease)}`);
  if (therapy) args.push(`therapyName: ${JSON.stringify(therapy)}`);
  if (level) args.push(`evidenceLevel: ${level}`);
  const query = `{ evidenceItems(${args.join(', ')}) { totalCount nodes { id evidenceLevel evidenceType evidenceDirection significance disease { name } therapies { name } molecularProfile { name } description } } }`;
  try {
    const r = await fetchWithRetry(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'OncoNo-Agent/1.0' },
      body: JSON.stringify({ query }),
    });
    if (!r.ok) {
      res.status(502).json({ available: false, source: 'civic', error: `CIViC responded ${r.status}`, endpoint });
      return;
    }
    const payload = (await r.json()) as {
      data?: { evidenceItems?: { totalCount: number; nodes: unknown[] } };
      errors?: unknown;
    };
    if (payload.errors) {
      res.status(502).json({ available: false, source: 'civic', error: 'CIViC GraphQL error', details: payload.errors });
      return;
    }
    const items = payload.data?.evidenceItems;
    res.json({
      available: true,
      source: 'civic',
      endpoint,
      total: items?.totalCount ?? 0,
      evidence: items?.nodes ?? [],
      attribution: 'Clinical evidence from CIViC (civicdb.org), CC0 1.0.',
    });
  } catch (err: unknown) {
    res.status(502).json({ available: false, source: 'civic', error: err instanceof Error ? err.message : 'CIViC query error' });
  }
});

// 23. OncoKB — actionability annotation (capability of the genomics-mcp OncoKB server; token-gated)
apiRouter.get('/external/oncokb-annotate', async (req: ExpressRequest, res: ExpressResponse) => {
  const gene = String(req.query.gene || '').trim().toUpperCase();
  const alteration = String(req.query.alteration || '').trim();
  const tumorType = String(req.query.tumorType || '').trim();
  const token = process.env.ONCOKB_TOKEN;
  if (!token) {
    res.json({
      available: false,
      source: 'oncokb',
      reason: 'ONCOKB_TOKEN not set',
      configure: 'ONCOKB_TOKEN',
      note: 'OncoKB annotation needs an academic token (https://www.oncokb.org/account/register).',
    });
    return;
  }
  if (!gene || !alteration) {
    res.status(400).json({ error: 'gene and alteration are required', source: 'oncokb' });
    return;
  }
  const url =
    `https://www.oncokb.org/api/v1/annotate/mutations/byProteinChange` +
    `?hugoSymbol=${encodeURIComponent(gene)}&alteration=${encodeURIComponent(alteration)}` +
    (tumorType ? `&tumorType=${encodeURIComponent(tumorType)}` : '');
  try {
    const r = await fetchWithRetry(url, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } });
    if (!r.ok) {
      res.status(502).json({ available: false, source: 'oncokb', error: `OncoKB responded ${r.status}` });
      return;
    }
    res.json({
      available: true,
      source: 'oncokb',
      gene,
      alteration,
      annotation: await r.json(),
      attribution: 'OncoKB (oncokb.org) — academic / non-profit use only.',
    });
  } catch (err: unknown) {
    res.status(502).json({ available: false, source: 'oncokb', error: err instanceof Error ? err.message : 'OncoKB query error' });
  }
});

// 24. MatchMiner — genomic-profile trial matching (DFCI matchminer / matchminer-ai-inference)
apiRouter.post('/external/matchminer', async (req: ExpressRequest, res: ExpressResponse) => {
  const base = (process.env.MATCHMINER_API || '').replace(/\/+$/, '');
  if (!base) {
    res.json({
      available: false,
      source: 'matchminer',
      reason: 'MATCHMINER_API not set',
      configure: 'MATCHMINER_API',
      note: 'Point at a MatchMiner instance (https://github.com/dfci/matchminer).',
    });
    return;
  }
  const profile = req.body && typeof req.body === 'object' ? (req.body.genomicProfile ?? req.body) : null;
  if (!profile || typeof profile !== 'object') {
    res.status(400).json({ error: 'Provide a genomic profile object (body.genomicProfile or body)', source: 'matchminer' });
    return;
  }
  try {
    const r = await fetchWithRetry(`${base}/api/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!r.ok) {
      res.status(502).json({ available: false, source: 'matchminer', error: `MatchMiner responded ${r.status}` });
      return;
    }
    res.json({ available: true, source: 'matchminer', matches: await r.json() });
  } catch (err: unknown) {
    res.status(502).json({ available: false, source: 'matchminer', error: err instanceof Error ? err.message : 'MatchMiner query error' });
  }
});

// 25. PCGR / CPSR — cancer-variant prioritization (nf-core/variantprioritization)
apiRouter.post('/external/pcgr', async (req: ExpressRequest, res: ExpressResponse) => {
  const base = (process.env.PCGR_API || '').replace(/\/+$/, '');
  if (!base) {
    res.json({
      available: false,
      source: 'pcgr',
      reason: 'PCGR_API not set',
      configure: 'PCGR_API',
      note: 'Point at a running PCGR/CPSR report service (nf-core/variantprioritization).',
    });
    return;
  }
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ error: 'Provide a request body (e.g. {vcf, assay, genomeAssembly})', source: 'pcgr' });
    return;
  }
  try {
    const r = await fetchWithRetry(`${base}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      res.status(502).json({ available: false, source: 'pcgr', error: `PCGR responded ${r.status}` });
      return;
    }
    res.json({ available: true, source: 'pcgr', report: await r.json() });
  } catch (err: unknown) {
    res.status(502).json({ available: false, source: 'pcgr', error: err instanceof Error ? err.message : 'PCGR query error' });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// DuckDB Cohort Query Engine Routes (26—28)
// All routes initialize the DB lazily on first call.
// ──────────────────────────────────────────────────────────────────────────────

// 26. GET /api/cohort/status — database readiness, registered views, data root
apiRouter.get('/cohort/status', async (_req: ExpressRequest, res: ExpressResponse) => {
  try {
    const status = await initCohortDb();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'CohortDB init error' });
  }
});

// 27. GET /api/cohort/schema?view=<viewName> — column names & types for a view
apiRouter.get('/cohort/schema', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await initCohortDb();
    const viewName = String(req.query.view || '').trim();
    if (!viewName) {
      const datasets = getRegisteredDatasets();
      res.json({ datasets });
      return;
    }
    const columns = await getViewSchema(viewName);
    res.json({ viewName, columns });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Schema error' });
  }
});

// 27b. GET /api/cohort/summary?view=<viewName> — row count + 5-row sample for a view
apiRouter.get('/cohort/summary', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await initCohortDb();
    const viewName = String(req.query.view || '').trim();
    if (!viewName) {
      res.status(400).json({ error: 'Missing view parameter' });
      return;
    }
    const summary = await getViewSummary(viewName);
    res.json({ viewName, ...summary });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Summary error' });
  }
});

// 28. POST /api/cohort/query — execute a read-only SQL query against cohort views
apiRouter.post('/cohort/query', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    await initCohortDb();
    const { sql } = req.body as { sql?: string };
    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      res.status(400).json({ error: 'Provide a non-empty SQL string in body: { sql: "SELECT ..." }' });
      return;
    }
    const result = await runCohortQuery(sql);
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Query execution error';
    const isUserError =
      message.toLowerCase().includes('not permitted') ||
      message.toLowerCase().includes('does not exist') ||
      message.toLowerCase().includes('syntax error');
    res.status(isUserError ? 400 : 500).json({ error: message });
  }
});
