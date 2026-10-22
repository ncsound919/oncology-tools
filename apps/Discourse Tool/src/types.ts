/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DebateFormat = 'roundtable' | 'oxford' | 'socratic';

export type ToneStyle = 'intellectual' | 'slang' | 'layman' | 'authoritative';

export type ModelEngine = 'gemini' | 'llama';

export type EpistemicLens = 'scientific' | 'mathematical' | 'philosophical' | 'moral';

export type ScientificRoleType =
  | 'literature_mapper'
  | 'mechanism_builder'
  | 'adversarial_critic'
  | 'methods_reviewer'
  | 'novelty_examiner'
  | 'translational_reviewer'
  | 'synthesis_editor';

export interface ScientificRoleDefinition {
  type: ScientificRoleType;
  title: string;
  objective: string;
  preventsFailureMode: string;
  requiredOutput: string;
  lens: EpistemicLens;
  avatar: string;
}

export type EvidenceTier =
  | 1 // Independent replication with prespecified analysis (different labs/cohorts)
  | 2 // Prospective experimental or clinical trials
  | 3 // Well-controlled observational or multi-omics cohorts
  | 4 // Animal models, organoids, and cell lines (mechanistic / preclinical)
  | 5 // Computational predictions, biological plausibility & literature synthesis
  | 0; // Agent agreement (strictly zero independent evidence)

export interface EvidenceItem {
  id: string;
  studyId: string;
  passageOrFinding: string;
  experimentalSystem: string;
  effectSize?: string;
  uncertaintyInterval?: string;
  sampleSize?: string;
  tier: EvidenceTier;
  urlOrRef?: string;
}

export interface CounterEvidenceItem {
  id: string;
  studyId: string;
  conflictingFinding: string;
  contextDifferences: string;
  tier: EvidenceTier;
}

export interface ClaimCard {
  id: string;
  claim: string;
  claimType: 'Causal / Mechanistic' | 'Associational / Biomarker' | 'Translational / Interventional' | 'Methodological / Epistemic';
  evidence: EvidenceItem[];
  counterevidence: CounterEvidenceItem[];
  alternativeExplanations: string[];
  testablePrediction: string;
  falsifier: string;
  confidence: number; // 0.0 to 1.0 (calibrated)
  confidenceRationale: string;
  evidenceTier: EvidenceTier;
  proposerRole?: string;
  status: 'supported' | 'contested' | 'falsified' | 'candidate';
  sourceCitations?: string[];
  causalLanguageWarning?: string;
  numericalFidelity?: {
    sampleSize?: string;
    effectDirection?: string;
    confidenceInterval?: string;
    pValue?: string;
    doseOrTimepoint?: string;
  };
  entityDisambiguation?: string[];
  abstentionFlag?: boolean;
}

export interface ExperimentalProtocol {
  hypothesisId: string;
  hypothesisTitle: string;
  targetMechanism: string;
  proposedPerturbation: string;
  biologicalModelSystem: string;
  positiveControl: string;
  negativeControl: string;
  vehicleOrScrambledControl: string;
  powerAnalysis: {
    statisticalPower: number;
    alpha: number;
    effectSizeEstimate: string;
    requiredSampleSize: string;
  };
  primaryEndpoints: string[];
  secondaryEndpoints: string[];
  leakageAndConfounderChecks: string[];
  prespecifiedFalsificationThreshold: string;
  timelineAndFeasibility: string;
  replicates?: string;
  blindingAndRandomization?: string;
  sampleAndReagentProvenance?: string;
  strictAcceptanceCriteria?: string;
}

export interface MinorityReport {
  role: string;
  agentName: string;
  dissentingClaim: string;
  evidenceBasis: string;
  unresolvedGap: string;
}

export interface CandidateHypothesisCard {
  rank: number;
  id: string;
  title: string;
  mechanism: string;
  claimCards: ClaimCard[];
  calibratedConfidence: number; // 0.0 - 1.0
  highestEvidenceTier: EvidenceTier;
  noveltyScore: number; // 0 - 100%
  priorArtComparison: string;
  falsificationProtocol: ExperimentalProtocol;
}

export interface ResearchBrief {
  id?: string;
  question: string;
  population_or_system: string;
  primary_outcome: string;
  candidate_mechanism: string;
  allowed_evidence: string[];
  excluded_evidence: string[];
  success_criterion: string;
}

export interface AgentPersona {
  id: string;
  name: string;
  avatar: string; // Emoji representing the persona
  role: string;   // e.g. "Adversarial Critic", "Literature Mapper", "Mechanism Builder"
  bio: string;
  stanceBrief: string;
  initialPosition: number; // -1.0 to 1.0 (strongly disagree to strongly agree)
  initialConfidence: number; // 0 to 100 (%)
  reasoningStyle: string; // e.g. "Dynamical Systems", "Virtue Ethics & QALY", "Empirical Proteomics", "Epistemological Deconstruction"
  primaryLens: EpistemicLens;
  secondaryLens?: EpistemicLens;
  formalDiscipline?: string;
  scientificRole?: ScientificRoleType;
  conflictingObjective?: string;
  failureModeGuarded?: string;
}

export interface StanceCard {
  id: string;
  title: string;
  claim: string;
  reasoning: string;
  confidence: number; // 0 to 100
  isActive: boolean;
  lens?: EpistemicLens;
  claimCard?: ClaimCard;
}

export interface TumorResearchQuestion {
  number: number;
  question: string;
  shortTitle: string;
  category: string;
  competingPositionsSummary: string;
  positionA: {
    title: string;
    claim: string;
  };
  positionB: {
    title: string;
    claim: string;
  };
  positionC?: {
    title: string;
    claim: string;
  };
  whyItMatters: string;
  scientificLens: string;
  mathematicalLens: string;
  philosophicalLens: string;
  moralLens: string;
  citations: string[];
  researchBrief?: ResearchBrief;
  benchmarkClaims?: ClaimCard[];
}

export interface CancerControversy {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  tagline: string;
  centralDebate: string;
  keyDilemma: string;
  proponentPosition: {
    title: string;
    claim: string;
    keyArguments: string[];
    evidenceStandards: string;
  };
  skepticPosition: {
    title: string;
    claim: string;
    keyArguments: string[];
    evidenceStandards: string;
  };
  methodologicalChallenge: {
    title: string;
    description: string;
    bottleneckType: 'Counterfactual Unobservability' | 'False-Positive Diagnostic Cascades' | 'Clonal Heterogeneity & Context-Dependency' | 'Surrogate-OS Disconnect' | 'Biosocial Confounding & Priority Ethics';
    keyNuance: string;
  };
  clinicalSettings: string[];
  specificExamples: string[];
  epistemicLenses: {
    scientific: string;
    mathematical: string;
    philosophical: string;
    moral: string;
  };
  defaultStanceCards: StanceCard[];
  researchBriefTemplate: ResearchBrief;
  recommendedPersonas: {
    role: string;
    description: string;
    primaryLens: EpistemicLens;
  }[];
}

export interface StatementTimeInfo {
  timestamp: string; // e.g. "T+01:34"
  elapsedSessionSeconds: number;
  allocatedSeconds: number;
  durationSeconds: number;
  timeStatus: 'within_window' | 'warning_extended' | 'budget_exceeded';
  speakingPaceWpm: number;
}

export interface TimingConfig {
  turnTimeWindowSeconds: number; // e.g. 30, 45, 60, 90, 120 (default 45)
  totalDebateBudgetMinutes: number; // e.g. 5, 10, 15, 20 (0 = unlimited, default 10)
  roundTimeWindows: { [roundIndex: number]: number }; // seconds per round
  pacingMode: 'live' | 'fast' | 'turbo';
  enforceLengthByTime: boolean;
  autoAdvanceOnTimeout: boolean;
}

export interface DebateStatement {
  agentId: string;
  agentName: string;
  avatar: string;
  role: string;
  scientificRole?: ScientificRoleType;
  roundIndex: number;
  statementText: string;
  updatedPosition: number; // -1.0 to 1.0
  updatedConfidence: number; // 0 to 100 (%)
  reasonForUpdate: string; // Why the agent updated their stance based on critiques
  critiqueTarget?: string; // ID or name of the agent they primarily critiqued
  
  // Standardized Claim Card Evaluated / Proposed in this statement
  evaluatedClaim?: ClaimCard;

  // Quad-Lens Epistemic Grounding
  activeLenses?: EpistemicLens[];
  mathematicalGrounding?: string; // e.g. Dynamical equations, Game Theory matrix, stochastic probability
  philosophicalPrinciple?: string; // e.g. Reductionist limits, teleology vs stochasticity, boundary ontology
  moralTradeoff?: string; // e.g. Toxicity vs survival, quality of life, pediatric risk ethics
  empiricalEvidence?: string; // e.g. Clinical trial citations, ATAC-seq, proteomic biomarkers
  
  // Epistemic Audit Elements
  falsificationAttempt?: string; // Concrete falsification check attempted against peer claim
  uncertaintySource?: string; // Calibration disclosure
  evidenceTierCited?: EvidenceTier;

  // Time Window Adherence & Speech Duration
  timing?: StatementTimeInfo;
}

export interface DebateRound {
  roundIndex: number;
  name: string;
  description: string;
  statements: DebateStatement[];
  userInterjection?: string; // Optional user feedback added after this round
  userInterjectionLens?: EpistemicLens;
  allocatedTimeSeconds?: number;
  elapsedTimeSeconds?: number;
  roundTimeStatus?: 'pending' | 'in_progress' | 'completed' | 'overtime';
}

export interface QuadLensScores {
  scientific: number;    // 0 to 100
  mathematical: number;  // 0 to 100
  philosophical: number; // 0 to 100
  moral: number;         // 0 to 100
}

export interface QuadLensBreakdown {
  scientificAnalysis: string;
  mathematicalAnalysis: string;
  philosophicalAnalysis: string;
  moralAnalysis: string;
}

export interface JudgeSynthesis {
  evaluationText: string;
  winner: string; // Candidate Hypothesis / Synthesized Stance
  keyArguments: { point: string; strength: number; contributor: string; lens?: EpistemicLens }[];
  dissent: string; // Strongest counter-arguments
  openQuestions: string[];
  consensusScore: number; // 0 to 100 (how close the agents came to agreement)
  
  // Quad-Lens Evaluation
  quadLensScores: QuadLensScores;
  quadLensBreakdown: QuadLensBreakdown;
  interconnectedChainAnalysis: string; // Explains progression across oncology domains

  // Scientific Accountability & Experimental Planning
  candidateHypotheses: CandidateHypothesisCard[];
  claimAuditTrail: ClaimCard[];
  minorityReports: MinorityReport[];
  preregisteredProtocols: ExperimentalProtocol[];
  noveltyVerdict: string;
  methodologicalAudit: {
    statisticalPowerSummary: string;
    leakageAndBiasRisks: string[];
    controlSufficiency: string;
  };
  contradictionMatrix?: { entity: string; modelOrIntervention: string; conflictingClaims: string[] }[];
  abstentionRequired?: boolean;
}

export interface DebateSession {
  id: string;
  topic: string;
  format: DebateFormat;
  toneStyle?: ToneStyle;
  timestamp: string;
  numRounds: number;
  currentRoundIndex: number;
  status: 'configuring' | 'spawning' | 'active' | 'judging' | 'completed';
  agents: AgentPersona[];
  rounds: DebateRound[];
  judgeResult?: JudgeSynthesis;
  contextMaterials: string;
  userStanceCards: StanceCard[];
  researchBrief?: ResearchBrief;
  timingConfig?: TimingConfig;
  totalElapsedSeconds?: number;
}

export interface SavedDebateSummary {
  id: string;
  topic: string;
  timestamp: string;
  format: DebateFormat;
  agentCount: number;
  winner: string;
  consensusScore: number;
  quadLensScores?: QuadLensScores;
  candidateHypothesisCount?: number;
  researchBriefQuestion?: string;
  timingConfig?: TimingConfig;
  totalElapsedSeconds?: number;
}
