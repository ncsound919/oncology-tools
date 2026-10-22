#!/usr/bin/env node
/**
 * Export oncology pipeline state into an open-notebook import bundle.
 *
 * Reads SRT hypotheses + runs, the latest unified report, and the latest
 * completed Discourse debate session, then writes markdown bundle files
 * into <ecosystem>/notebook-inbox/ — one topic per file with frontmatter
 * (title/topics/source refs) that open-notebook ingests as sources.
 *
 * Zero dependencies, plain node. Run from anywhere:
 *   node apps/research-orchestrator/scripts/export-to-notebook.mjs [--limit 10]
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.ONCOLOGY_ROOT ||
  "C:\\Users\\User\\Downloads\\BUSINESS\\SCIENCE\\Oncology Ecosystem";
const args = process.argv.slice(2);
const LIMIT = Number((args[args.indexOf("--limit") + 1]) || 10) || 10;

const ORCH = path.join(ROOT, "apps", "research-orchestrator");
const OUT = path.join(ROOT, "notebook-inbox");
fs.mkdirSync(OUT, { recursive: true });

const readJson = (p, fb) => {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
};
const slug = (s) => String(s || "untitled").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const today = new Date().toISOString().slice(0, 10);
const written = [];

// 1. Hypotheses (preregistered + proposed)
const hyps = readJson(path.join(ORCH, "data", "srt", "hypotheses.json"), {});
for (const h of (hyps.hypotheses || []).slice(-LIMIT)) {
  const name = `${today}-hypothesis-${slug(h.title)}.md`;
  const body = `---\ntitle: "Hypothesis: ${h.title}"\ntopics: [oncology, hypothesis, ${h.status || "proposed"}]\nsource: srt/hypotheses.json#${h.id}\nevidence_tier: ${h.evidenceTier ?? "n/a"}\nconfidence: ${h.calibratedConfidence ?? "n/a"}\n---\n\n# ${h.title}\n\n- **Status:** ${h.status}\n- **Mechanism:** ${h.mechanism || "n/a"}\n- **Evidence tier:** ${h.evidenceTier ?? "n/a"} | **Calibrated confidence:** ${h.calibratedConfidence ?? "n/a"}\n- **Created:** ${h.createdAt}\n${h.preregistration ? `\n## Preregistration\n- Data plan: ${h.preregistration.dataPlan}\n- Analysis plan: ${h.preregistration.analysisPlan}\n- Holdout: ${h.preregistration.holdout}\n` : ""}\n${(h.outcomes || []).length ? `\n## Outcomes\n${h.outcomes.map((o) => `- ${o}`).join("\n")}\n` : "\n## Outcomes\n- _none recorded yet_\n"}\n`;
  fs.writeFileSync(path.join(OUT, name), body);
  written.push(name);
}

// 2. Runs (latest experiment runs)
const runs = readJson(path.join(ORCH, "data", "srt", "runs.json"), []);
for (const r of runs.slice(-LIMIT)) {
  const name = `${today}-run-${slug(r.hypothesisTitle)}.md`;
  const body = `---\ntitle: "Run: ${r.hypothesisTitle}"\ntopics: [oncology, experiment-run, ${r?.target?.kind || "run"}]\nsource: srt/runs.json#${r.id}\n---\n\n# ${r.hypothesisTitle}\n\n- **Run:** ${r.id}\n- **Target:** ${(r.target && r.target.kind) || "n/a"} / ${(r.target && r.target.experimentId) || ""}\n- **Analysis plan:** ${r.analysisPlan || "n/a"}\n- **Primary outcome:** ${r.primaryOutcome || "n/a"}\n- **Success criterion:** ${r.successCriterion || "n/a"}\n- **Falsifier:** ${r.falsifier || "n/a"}\n- **Seed:** ${(r.seeds && r.seeds.seed) || "n/a"} (${(r.seeds && r.seeds.day) || ""})\n- **Created:** ${r.createdAt}\n${r.notes ? `\n## Notes\n${r.notes}\n` : ""}\n`;
  fs.writeFileSync(path.join(OUT, name), body);
  written.push(name);
}

// 3. Latest unified report (pointer + inline if small)
const reportsDir = path.join(ROOT, "platform", "reports");
let latestReport = null;
try {
  const cands = fs.readdirSync(reportsDir)
    .filter((f) => f.startsWith("unified-oncology-") && f.endsWith("-full.md")).sort();
  latestReport = cands[cands.length - 1];
} catch { /* no reports dir */ }
if (latestReport) {
  const full = fs.readFileSync(path.join(reportsDir, latestReport), "utf8");
  const name = `${today}-unified-report.md`;
  const body = `---\ntitle: "Unified oncology report (${latestReport})"\ntopics: [oncology, report, synthesis]\nsource: platform/reports/${latestReport}\n---\n\n${full.length < 60000 ? full : `> Full report is ${(full.length / 1024).toFixed(0)} KB — see platform/reports/${latestReport}.\n\n${full.slice(0, 8000)}\n`}`;
  fs.writeFileSync(path.join(OUT, name), body);
  written.push(name);
}

// 4. Latest completed Discourse debate session
const debates = readJson(
  path.join(ROOT, "apps", "Discourse Tool", "data", "debates.json"), []);
const done = debates.filter((d) => d.status === "completed");
const session = done[done.length - 1];
if (session) {
  const judge = session.judgeResult || {};
  const name = `${today}-debate-${slug(session.topic)}.md`;
  const stmts = (session.rounds || []).flatMap((r) => r.statements || [])
    .map((s) => `### ${s.agentName} (${s.role})\n${s.statementText}\n${s.falsificationAttempt ? `> Falsification probe: ${s.falsificationAttempt}\n` : ""}`).join("\n");
  const body = `---\ntitle: "Debate: ${session.topic}"\ntopics: [oncology, debate, discourse]\nsource: discourse-tool session ${session.id}\nconsensus: ${judge.consensusScore ?? "n/a"}\nverdict: ${(judge.winner || "").replace(/\n/g, " ")}\n---\n\n# ${session.topic}\n\n- **Consensus:** ${judge.consensusScore ?? "n/a"}/100 | **Verdict:** ${judge.winner || "n/a"}\n- **Dissent:** ${judge.dissent || "none recorded"}\n\n## Transcript\n\n${stmts || "_no statements exported_"}\n\n## Preregistered next steps\n\n${((judge.preregisteredProtocols || []).map((p) => `- ${p.hypothesisTitle} (n=${p.powerAnalysis.requiredSampleSize})`).join("\n")) || "_none_"}\n`;
  fs.writeFileSync(path.join(OUT, name), body);
  written.push(name);
}

fs.writeFileSync(path.join(OUT, `${today}-manifest.json`),
  JSON.stringify({ exportedAt: new Date().toISOString(), files: written }, null, 2));
console.log(`notebook-inbox: ${written.length} bundles`);
for (const w of written) console.log(` - ${w}`);
console.log("Next: add notebook-inbox/ files as open-notebook sources, then run episodes (oncology_experiment_log / oncology_paper / oncology_debate).");
