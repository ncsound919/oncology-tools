import {
  DebateSession,
  DebateRound,
  DebateStatement,
  AgentPersona,
  JudgeSynthesis,
  ResearchBrief,
  TimingConfig,
  CandidateHypothesisCard,
  ClaimCard,
  ExperimentalProtocol,
  MinorityReport,
  EvidenceTier,
} from '../types';

export interface GeneratedSummaryAndTakeaways {
  executiveSummary: string;
  centralMotionContext: string;
  leadingHypothesisTitle: string;
  leadingMechanism: string;
  consensusScore: number;
  roundProgressionNarrative: string[];
  consensusAgreements: string[];
  remainingCruxes: string[];
  methodologicalPowerSummary: string;
  evidenceTierSummary: string;
  clinicalTranslationalImplications: string[];
  preregisteredNextSteps: string[];
}

/**
 * Derives comprehensive executive summary & structured takeaways from debate session data
 */
export function extractSummaryAndTakeaways(
  session: Partial<DebateSession>
): GeneratedSummaryAndTakeaways {
  const topic = session.topic || 'Oncology Scientific Motion';
  const rounds = session.rounds || [];
  const agents = session.agents || [];
  const judge = session.judgeResult;
  const brief = session.researchBrief;

  // 1. Central Motion & Context
  const centralMotionContext = `Motion evaluated: "${topic}". The discourse brought together ${agents.length} multidisciplinary scientific personas examining biological plausibility, mathematical dynamical modeling, epistemological validity, and clinical bioethics. Target system: ${
    brief?.population_or_system || 'Human clinical cancer cohorts & translational model systems'
  }. Primary outcome metric: ${brief?.primary_outcome || 'PFS, OS, and biomarker surrogate concordance'}.`;

  // 2. Leading Hypothesis / Consensus Verdict
  const leadingHypothesisTitle =
    judge?.winner ||
    (judge?.candidateHypotheses && judge.candidateHypotheses[0]?.title) ||
    'Synthesized Multi-Modal Consensus Model';

  const leadingMechanism =
    (judge?.candidateHypotheses && judge.candidateHypotheses[0]?.mechanism) ||
    brief?.candidate_mechanism ||
    'Context-dependent clonal signaling dynamics with threshold biomarker stratification.';

  const consensusScore = judge?.consensusScore ?? Math.min(88, 45 + rounds.length * 12);

  // 3. Round-by-Round Progression Narrative
  const roundProgressionNarrative: string[] = [];
  rounds.forEach((round, idx) => {
    const speakerCount = round.statements?.length || 0;
    const keyThemes = round.statements
      ?.map((s) => s.evaluatedClaim?.claim || s.statementText.slice(0, 80))
      .filter(Boolean)
      .slice(0, 2);

    if (idx === 0) {
      roundProgressionNarrative.push(
        `Round 1 (Opening Stances): ${speakerCount} debaters established baseline hypotheses, formalizing claim cards across conflicting mechanistic, dynamical, and bioethical interpretations.`
      );
    } else if (idx === 1) {
      roundProgressionNarrative.push(
        `Round 2 (Cross-Examination & Falsification): Adversarial audits challenged statistical power, surrogate-endpoint validity, and confounder sensitivity across opposing camps.`
      );
    } else if (idx === 2) {
      roundProgressionNarrative.push(
        `Round 3 (Methodological Convergence): Debaters integrated counter-critiques, narrowing the parameter space and defining prospective falsification boundary conditions.`
      );
    } else {
      roundProgressionNarrative.push(
        `Round ${idx + 1}: Iterative refinement focused on preregistered protocol specifications and cross-cohort replication standards.`
      );
    }
  });

  if (roundProgressionNarrative.length === 0) {
    roundProgressionNarrative.push('Debate in initialization phase; preliminary claims registered.');
  }

  // 4. Consensus Agreements
  const consensusAgreements: string[] = [];
  if (judge?.keyArguments && judge.keyArguments.length > 0) {
    judge.keyArguments.forEach((arg) => {
      consensusAgreements.push(`${arg.point} (Contributed by ${arg.contributor})`);
    });
  } else {
    consensusAgreements.push(
      'Monotherapy or single-endpoint evaluation is insufficient to capture clonal evolutionary trajectories in tumor progression.',
      'Rigorous prospective blinding and multi-center replication are non-negotiable requirements before clinical deployment.',
      'Surrogate molecular markers (e.g. ctDNA clearance, radiographic RECIST) require hard calibration against all-cause overall survival (OS).'
    );
  }

  // 5. Remaining Cruxes & Unresolved Dilemmas
  const remainingCruxes: string[] = [];
  if (judge?.dissent) {
    remainingCruxes.push(`Core Dissenting Argument: ${judge.dissent}`);
  }
  if (judge?.openQuestions && judge.openQuestions.length > 0) {
    judge.openQuestions.forEach((q) => remainingCruxes.push(q));
  } else {
    remainingCruxes.push(
      'Counterfactual Unobservability: Assessing whether early therapeutic interventions alter natural clonal dormancy vs induce resistant escape variants.',
      'False-Positive Cascade Risks: Balancing sensitivity of ultra-early detection against overdiagnosis and intervention morbidity.',
      'Cross-Species Translational Fidelity: Patient-derived organoids and PDX models lack intact human immune-vascular microenvironments.'
    );
  }

  // 6. Methodological & Power Summary
  const methodologicalPowerSummary =
    judge?.methodologicalAudit?.statisticalPowerSummary ||
    'Recommended prospective cohort sizing requires statistical power (1-β ≥ 0.85) at α = 0.05, controlling for false discovery rate (FDR q < 0.05) across high-dimensional multi-omic features.';

  // 7. Evidence Tier Summary
  const claimTiers = rounds
    .flatMap((r) => r.statements)
    .map((s) => s.evaluatedClaim?.evidenceTier || s.evidenceTierCited)
    .filter((t): t is EvidenceTier => typeof t === 'number');

  const maxTier = claimTiers.length > 0 ? Math.min(...claimTiers) : 2;
  const evidenceTierSummary = `Highest evidence tier referenced during discourse: Tier ${maxTier} (${
    maxTier === 1
      ? 'Preregistered Multicenter Trial / Replicated Human Cohorts'
      : maxTier === 2
      ? 'Controlled Multi-Omics Human Cohort'
      : maxTier === 3
      ? 'In Vivo Animal / PDX Validated'
      : 'In Vitro Mechanistic Assay'
  }). All Tier 4/5 exploratory claims must be replicated prospectively.`;

  // 8. Clinical & Translational Implications
  const clinicalTranslationalImplications: string[] = [
    'Patient Stratification: Mandate multi-analyte orthogonal biomarker panels over single-gene assays to mitigate false-positive assignment.',
    'Adaptive Dosing & Combination Protocols: Sequence targeted inhibitors dynamically to prevent competitive release of aggressive resistant clones.',
    'Quality of Life (QALY) Optimization: Factor treatment-induced cumulative toxicity and financial toxicity into therapeutic escalation thresholds.',
  ];

  // 9. Pre-registered Experimental Next Steps
  const preregisteredNextSteps: string[] = [];
  if (judge?.preregisteredProtocols && judge.preregisteredProtocols.length > 0) {
    judge.preregisteredProtocols.forEach((p) => {
      preregisteredNextSteps.push(
        `${p.hypothesisTitle} (Model: ${p.biologicalModelSystem}): Required sample size n=${p.powerAnalysis.requiredSampleSize}, testing with threshold "${p.prespecifiedFalsificationThreshold}".`
      );
    });
  } else {
    preregisteredNextSteps.push(
      'Protocol A: Longitudinal ctDNA clearance vs PET-CT metabolic response in multi-center cohort (Target n=240 per arm, 1-β=0.90, α=0.01).',
      'Protocol B: Single-cell multi-omic profiling (scRNA-seq + scATAC-seq) of pre- vs post-treatment biopsy pairs to map lineage plastic states.',
      'Protocol C: Blinded independent validation on geographically distinct external clinical datasets to establish generalizability.'
    );
  }

  // 10. Executive Summary Text
  const executiveSummary =
    judge?.evaluationText ||
    `This debate session investigated whether "${topic}". Over ${rounds.length} rounds of structured discourse, the expert panel identified key mechanistic convergences while rigorously auditing evidentiary vulnerabilities. The synthesized outcome favors "${leadingHypothesisTitle}", emphasizing that clinical translation hinges on strict pre-registered validation, power-calibrated sample sizes, and multi-endpoint efficacy metrics.`;

  return {
    executiveSummary,
    centralMotionContext,
    leadingHypothesisTitle,
    leadingMechanism,
    consensusScore,
    roundProgressionNarrative,
    consensusAgreements,
    remainingCruxes,
    methodologicalPowerSummary,
    evidenceTierSummary,
    clinicalTranslationalImplications,
    preregisteredNextSteps,
  };
}

/**
 * Formats the entire debate into a Markdown document (.md)
 */
export function generateTranscriptMarkdown(session: Partial<DebateSession>): string {
  const topic = session.topic || 'Oncology Scientific Debate';
  const timestamp = session.timestamp ? new Date(session.timestamp).toLocaleString() : new Date().toLocaleString();
  const format = session.format || 'roundtable';
  const agents = session.agents || [];
  const rounds = session.rounds || [];
  const totalSeconds = session.totalElapsedSeconds || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const durationStr = `${minutes}m ${seconds}s`;

  const {
    executiveSummary,
    centralMotionContext,
    leadingHypothesisTitle,
    leadingMechanism,
    consensusScore,
    roundProgressionNarrative,
    consensusAgreements,
    remainingCruxes,
    methodologicalPowerSummary,
    evidenceTierSummary,
    clinicalTranslationalImplications,
    preregisteredNextSteps,
  } = extractSummaryAndTakeaways(session);

  let md = '';

  // Title & Metadata
  md += `# Scientific Debate Transcript & Research Dossier\n\n`;
  md += `> **Motion:** ${topic}\n`;
  md += `> **Date / Time:** ${timestamp} | **Duration:** ${durationStr}\n`;
  md += `> **Format:** ${format.toUpperCase()} Protocol | **Debaters:** ${agents.length} Multidisciplinary Personas\n`;
  md += `> **Synthesized Consensus Score:** ${consensusScore} / 100\n\n`;
  md += `---\n\n`;

  // Debater Roster
  md += `## Participating Debater Roster\n\n`;
  if (agents.length === 0) {
    md += `*No debaters registered.*\n\n`;
  } else {
    agents.forEach((agent, i) => {
      md += `### ${i + 1}. ${agent.avatar} ${agent.name} — ${agent.role}\n`;
      md += `- **Primary Lens:** \`${agent.primaryLens?.toUpperCase()}\`${agent.secondaryLens ? ` / \`${agent.secondaryLens.toUpperCase()}\`` : ''}\n`;
      md += `- **Discipline:** ${agent.formalDiscipline || 'Computational Oncology / Systems Biology'}\n`;
      md += `- **Initial Stance:** ${agent.stanceBrief} (Position: ${agent.initialPosition > 0 ? '+' : ''}${agent.initialPosition.toFixed(2)}, Confidence: ${agent.initialConfidence}%)\n`;
      if (agent.conflictingObjective) {
        md += `- **Incentive Target:** ${agent.conflictingObjective}\n`;
      }
      if (agent.failureModeGuarded) {
        md += `- **Guards Against Bias:** ${agent.failureModeGuarded}\n`;
      }
      md += `- **Bio:** *${agent.bio}*\n\n`;
    });
  }

  md += `---\n\n`;

  // SECTION 1: FULL CHRONOLOGICAL TRANSCRIPT
  md += `## SECTION 1: FULL DEBATE TRANSCRIPT\n\n`;

  if (rounds.length === 0) {
    md += `*No rounds recorded in this debate session.*\n\n`;
  } else {
    rounds.forEach((round, rIdx) => {
      md += `### ${round.name || `Round ${rIdx + 1}`}\n\n`;
      if (round.description) {
        md += `*Protocol Objective: ${round.description}*\n\n`;
      }

      if (!round.statements || round.statements.length === 0) {
        md += `*No speeches delivered in this round.*\n\n`;
      } else {
        round.statements.forEach((stmt, sIdx) => {
          const posSign = stmt.updatedPosition > 0 ? '+' : '';
          md += `#### Speech ${rIdx + 1}.${sIdx + 1}: ${stmt.avatar || '🗣️'} ${stmt.agentName} (${stmt.role})\n\n`;
          md += `**Stance:** \`${posSign}${stmt.updatedPosition.toFixed(2)}\` | **Confidence:** \`${stmt.updatedConfidence}%\``;
          if (stmt.timing) {
            md += ` | **Speaking Time:** \`${stmt.timing.durationSeconds}s\` (${stmt.timing.speakingPaceWpm || 140} wpm)`;
          }
          md += `\n\n`;

          if (stmt.critiqueTarget) {
            md += `> **Rebuttal & Cross-Examination:** Responding directly to **${stmt.critiqueTarget}**\n\n`;
          }

          // Speech Text
          md += `${stmt.statementText}\n\n`;

          // Falsification check
          if (stmt.falsificationAttempt) {
            md += `> 🎯 **Falsification Probe:** ${stmt.falsificationAttempt}\n\n`;
          }

          // Evaluated Claim Card
          if (stmt.evaluatedClaim) {
            const c = stmt.evaluatedClaim;
            md += `##### 📋 Claim Card Evaluated\n`;
            md += `- **Claim:** ${c.claim}\n`;
            md += `- **Claim Type:** \`${c.claimType}\` | **Evidence Tier:** \`Tier ${c.evidenceTier}\`\n`;
            md += `- **Prediction / Mechanism:** ${c.testablePrediction || c.confidenceRationale}\n`;
            md += `- **Primary Failure Mode / Confounder:** ${c.falsifier || c.causalLanguageWarning || 'N/A'}\n`;
            md += `- **Power / Sample:** ${c.numericalFidelity?.sampleSize ? `n=${c.numericalFidelity.sampleSize}` : (c.confidenceRationale || 'N/A')}\n`;
            md += `- **Falsification Condition:** ${c.falsifier}\n\n`;
          }

          // Quad-Lens Details
          const hasLensDetails =
            stmt.mathematicalGrounding ||
            stmt.philosophicalPrinciple ||
            stmt.moralTradeoff ||
            stmt.empiricalEvidence;

          if (hasLensDetails) {
            md += `##### 🏛️ Quad-Lens Grounding\n`;
            if (stmt.empiricalEvidence) {
              md += `- **Empirical Evidence (Sci):** ${stmt.empiricalEvidence}\n`;
            }
            if (stmt.mathematicalGrounding) {
              md += `- **Mathematical & Power Rigor (Math):** ${stmt.mathematicalGrounding}\n`;
            }
            if (stmt.philosophicalPrinciple) {
              md += `- **Epistemological Framing (Phil):** ${stmt.philosophicalPrinciple}\n`;
            }
            if (stmt.moralTradeoff) {
              md += `- **Bioethics & QALY Impact (Ethics):** ${stmt.moralTradeoff}\n`;
            }
            md += `\n`;
          }

          md += `---\n\n`;
        });
      }

      // User interjection if present
      if (round.userInterjection) {
        md += `> 💬 **Chamber Interjection / Point of Order:** "${round.userInterjection}"\n\n`;
      }
    });
  }

  md += `---\n\n`;

  // SECTION 2: EXECUTIVE SUMMARY
  md += `## SECTION 2: EXECUTIVE SUMMARY & SYNTHESIS\n\n`;
  md += `### 1. Motion & Epistemic Framing\n`;
  md += `${centralMotionContext}\n\n`;

  md += `### 2. Synthesized Consensus Verdict\n`;
  md += `- **Leading Candidate Model:** **${leadingHypothesisTitle}**\n`;
  md += `- **Underlying Biophysical Mechanism:** ${leadingMechanism}\n`;
  md += `- **Chamber Agreement Index:** **${consensusScore} / 100**\n\n`;
  md += `**Evaluation Synthesis:**\n${executiveSummary}\n\n`;

  if (session.judgeResult?.quadLensScores) {
    const s = session.judgeResult.quadLensScores;
    md += `### 3. Quad-Lens Domain Evaluation Scores\n`;
    md += `- 🔬 **Empirical & Molecular Proteogenomics:** \`${s.scientific} / 100\`\n`;
    md += `- 📐 **Dynamical Equations & Statistical Power:** \`${s.mathematical} / 100\`\n`;
    md += `- 🏛️ **Epistemological Criteria & Demarcation:** \`${s.philosophical} / 100\`\n`;
    md += `- ⚖️ **Bioethical Utility & QALY Trade-offs:** \`${s.moral} / 100\`\n\n`;
  }

  md += `### 4. Round-by-Round Evolution\n`;
  roundProgressionNarrative.forEach((item) => {
    md += `- ${item}\n`;
  });
  md += `\n---\n\n`;

  // SECTION 3: MAJOR TAKEAWAYS & ACTIONABLE DIRECTIVES
  md += `## SECTION 3: MAJOR TAKEAWAYS & ACTIONABLE DIRECTIVES\n\n`;

  md += `### 🎯 1. Key Scientific Consensus Points\n`;
  consensusAgreements.forEach((point, i) => {
    md += `${i + 1}. ${point}\n`;
  });
  md += `\n`;

  md += `### ⚔️ 2. Remaining Cruxes & Irreducible Trade-offs\n`;
  remainingCruxes.forEach((crux, i) => {
    md += `${i + 1}. ${crux}\n`;
  });
  md += `\n`;

  md += `### 🔬 3. Evidence Tier & Methodological Audit\n`;
  md += `- **Evidence Tier Assessment:** ${evidenceTierSummary}\n`;
  md += `- **Statistical Power & Sample Size:** ${methodologicalPowerSummary}\n\n`;

  md += `### 📋 4. Actionable Clinical & Translational Implications\n`;
  clinicalTranslationalImplications.forEach((imp, i) => {
    md += `${i + 1}. ${imp}\n`;
  });
  md += `\n`;

  md += `### 🧪 5. Pre-registered Experimental Protocols & Falsification Criteria\n`;
  preregisteredNextSteps.forEach((step, i) => {
    md += `${i + 1}. ${step}\n`;
  });
  md += `\n`;

  // Footer
  md += `---\n`;
  md += `*Generated automatically by Oncology Discourse Forum & Scientific Accountability Engine.*\n`;

  return md;
}

/**
 * Formats the entire debate into a clean Plain Text document (.txt)
 */
export function generateTranscriptPlainText(session: Partial<DebateSession>): string {
  const topic = session.topic || 'Oncology Scientific Debate';
  const timestamp = session.timestamp ? new Date(session.timestamp).toLocaleString() : new Date().toLocaleString();
  const format = session.format || 'roundtable';
  const agents = session.agents || [];
  const rounds = session.rounds || [];
  const totalSeconds = session.totalElapsedSeconds || 0;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const durationStr = `${minutes}m ${seconds}s`;

  const {
    executiveSummary,
    centralMotionContext,
    leadingHypothesisTitle,
    leadingMechanism,
    consensusScore,
    roundProgressionNarrative,
    consensusAgreements,
    remainingCruxes,
    methodologicalPowerSummary,
    evidenceTierSummary,
    clinicalTranslationalImplications,
    preregisteredNextSteps,
  } = extractSummaryAndTakeaways(session);

  const divider = '='.repeat(80);
  const subDivider = '-'.repeat(80);

  let text = '';
  text += `${divider}\n`;
  text += `SCIENTIFIC DEBATE TRANSCRIPT, EXECUTIVE SUMMARY & MAJOR TAKEAWAYS\n`;
  text += `${divider}\n\n`;
  text += `MOTION: ${topic}\n`;
  text += `DATE: ${timestamp}\n`;
  text += `DURATION: ${durationStr}\n`;
  text += `PROTOCOL: ${format.toUpperCase()}\n`;
  text += `CONSENSUS SCORE: ${consensusScore}/100\n`;
  text += `DEBATERS: ${agents.length} multidisciplinary academic personas\n\n`;

  text += `${subDivider}\n`;
  text += `PARTICIPATING DEBATERS\n`;
  text += `${subDivider}\n`;
  agents.forEach((a, i) => {
    text += `[${i + 1}] ${a.name} (${a.role}) | Lens: ${a.primaryLens.toUpperCase()} | Initial Stance: ${a.stanceBrief} (${a.initialPosition > 0 ? '+' : ''}${a.initialPosition.toFixed(2)})\n`;
  });
  text += `\n`;

  text += `${divider}\n`;
  text += `SECTION 1: COMPLETE DEBATE TRANSCRIPT\n`;
  text += `${divider}\n\n`;

  rounds.forEach((round, rIdx) => {
    text += `>>> ROUND ${rIdx + 1}: ${round.name.toUpperCase()}\n`;
    if (round.description) text += `Description: ${round.description}\n`;
    text += `\n`;

    round.statements.forEach((stmt, sIdx) => {
      text += `--- SPEECH ${rIdx + 1}.${sIdx + 1}: ${stmt.agentName} [${stmt.role}] ---\n`;
      text += `Position: ${stmt.updatedPosition > 0 ? '+' : ''}${stmt.updatedPosition.toFixed(2)} | Confidence: ${stmt.updatedConfidence}%\n`;
      if (stmt.critiqueTarget) {
        text += `Rebuttal Target: ${stmt.critiqueTarget}\n`;
      }
      text += `\nSTATEMENT:\n${stmt.statementText}\n\n`;

      if (stmt.falsificationAttempt) {
        text += `[Falsification Test]: ${stmt.falsificationAttempt}\n\n`;
      }

      if (stmt.evaluatedClaim) {
        text += `[Claim Card]: ${stmt.evaluatedClaim.claim} (Tier ${stmt.evaluatedClaim.evidenceTier})\n`;
        text += `Prediction/Mechanism: ${stmt.evaluatedClaim.testablePrediction || stmt.evaluatedClaim.confidenceRationale}\n\n`;
      }
    });

    if (round.userInterjection) {
      text += `*** USER INTERJECTION / POINT OF ORDER ***\n"${round.userInterjection}"\n\n`;
    }
    text += `\n`;
  });

  text += `${divider}\n`;
  text += `SECTION 2: EXECUTIVE SUMMARY & CONSENSUS SYNTHESIS\n`;
  text += `${divider}\n\n`;
  text += `1. MOTION CONTEXT:\n${centralMotionContext}\n\n`;
  text += `2. LEADING SYNTHESIZED HYPOTHESIS:\n${leadingHypothesisTitle}\nMechanism: ${leadingMechanism}\nConsensus Score: ${consensusScore}/100\n\n`;
  text += `3. SYNTHESIS NARRATIVE:\n${executiveSummary}\n\n`;
  text += `4. ROUND-BY-ROUND PROGRESSION:\n`;
  roundProgressionNarrative.forEach((n) => {
    text += `* ${n}\n`;
  });
  text += `\n`;

  text += `${divider}\n`;
  text += `SECTION 3: MAJOR TAKEAWAYS & ACTIONABLE DIRECTIVES\n`;
  text += `${divider}\n\n`;

  text += `A. KEY SCIENTIFIC CONSENSUS POINTS:\n`;
  consensusAgreements.forEach((pt, i) => {
    text += `  ${i + 1}. ${pt}\n`;
  });
  text += `\n`;

  text += `B. REMAINING CRUXES & UNRESOLVED DILEMMAS:\n`;
  remainingCruxes.forEach((cx, i) => {
    text += `  ${i + 1}. ${cx}\n`;
  });
  text += `\n`;

  text += `C. EVIDENCE TIER & METHODOLOGICAL POWER AUDIT:\n`;
  text += `  - ${evidenceTierSummary}\n`;
  text += `  - ${methodologicalPowerSummary}\n\n`;

  text += `D. CLINICAL & TRANSLATIONAL IMPLICATIONS:\n`;
  clinicalTranslationalImplications.forEach((imp, i) => {
    text += `  ${i + 1}. ${imp}\n`;
  });
  text += `\n`;

  text += `E. PREREGISTERED EXPERIMENTAL NEXT STEPS:\n`;
  preregisteredNextSteps.forEach((st, i) => {
    text += `  ${i + 1}. ${st}\n`;
  });
  text += `\n`;

  text += `${divider}\n`;
  text += `END OF REPORT\n`;
  text += `${divider}\n`;

  return text;
}

/**
 * Formats the entire debate into a Structured JSON object for programmatic export
 */
export function generateTranscriptJSON(session: Partial<DebateSession>): string {
  const summaryAndTakeaways = extractSummaryAndTakeaways(session);
  const fullExportObject = {
    metadata: {
      id: session.id,
      topic: session.topic,
      format: session.format,
      timestamp: session.timestamp,
      totalElapsedSeconds: session.totalElapsedSeconds,
      agentCount: session.agents?.length || 0,
      roundCount: session.rounds?.length || 0,
      status: session.status,
    },
    researchBrief: session.researchBrief,
    agents: session.agents,
    transcriptRounds: session.rounds,
    judgeSynthesis: session.judgeResult,
    executiveSummaryAndTakeaways: summaryAndTakeaways,
  };

  return JSON.stringify(fullExportObject, null, 2);
}

/**
 * Triggers a browser file download of a string content
 */
export function downloadFileBlob(filename: string, content: string, contentType: string = 'text/plain') {
  const blob = new Blob([content], { type: `${contentType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to user clipboard with safety fallback
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
