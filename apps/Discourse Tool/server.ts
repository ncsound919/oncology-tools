import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
// Canonical port is 3030: the tool's old default 3000 collides with Grafana on
// this host, and the fleet registry + platform client both expect :3030. PORT
// still overrides so the tool can run anywhere.
const PORT = Number(process.env.PORT ?? 3030);

/**
 * Default model engine.
 *
 * The ecosystem's model access is the LiteLLM router (`orchestration/llm`
 * launches it; the fleet config is `INFRASTRUCTURE/model-router/litellm.yaml`,
 * served on :4100). It reaches gemini, deepseek, ollama-cloud, the openrouter
 * free pool and the opencode lanes through ONE endpoint with fallbacks and a
 * budget guard, so a per-app provider key is the weaker setup: one provider,
 * one key to rotate, no fallback when it 401s or rate-limits.
 *
 * So the default is the router, and `DISCOURSE_ENGINE=gemini` restores the
 * direct-Gemini path (it is still fully supported) without a code edit.
 */
const DEFAULT_ENGINE = process.env.DISCOURSE_ENGINE || "openai";

app.use(express.json());

// Initialize Gemini Client with lazy initialization
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY is not configured. Please add it in Settings > Secrets in AI Studio.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Local File Database for Memory Persistence
const DATA_DIR = path.join(process.cwd(), "data");
const DEBATES_FILE = path.join(DATA_DIR, "debates.json");

function initStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEBATES_FILE)) {
    fs.writeFileSync(DEBATES_FILE, JSON.stringify([]));
  }
}

function readDebates() {
  try {
    initStorage();
    const data = fs.readFileSync(DEBATES_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading debates database:", err);
    return [];
  }
}

function writeDebates(debates: any[]) {
  try {
    initStorage();
    fs.writeFileSync(DEBATES_FILE, JSON.stringify(debates, null, 2));
  } catch (err) {
    console.error("Error writing debates database:", err);
  }
}

// --- API ROUTES ---

// Get all saved debates
app.get("/api/debates", (req, res) => {
  const debates = readDebates();
  const summaries = debates.map((d: any) => ({
    id: d.id,
    topic: d.topic,
    timestamp: d.timestamp,
    format: d.format,
    agentCount: d.agents?.length || 0,
    winner: d.judgeResult?.winner || "No winner yet",
    consensusScore: d.judgeResult?.consensusScore ?? 0,
    quadLensScores: d.judgeResult?.quadLensScores,
    candidateHypothesisCount: d.judgeResult?.candidateHypotheses?.length || 0,
    researchBriefQuestion: d.researchBrief?.question,
    timingConfig: d.timingConfig,
    totalElapsedSeconds: d.totalElapsedSeconds,
  }));
  res.json(summaries);
});

// Get a single debate session details
app.get("/api/debates/:id", (req, res) => {
  const debates = readDebates();
  const session = debates.find((d: any) => d.id === req.params.id);
  if (!session) {
    res.status(404).json({ error: "Debate session not found" });
    return;
  }
  res.json(session);
});

// Save or update a debate session
app.post("/api/debates", (req, res) => {
  const session = req.body;
  if (!session || !session.id) {
    res.status(400).json({ error: "Invalid session data" });
    return;
  }

  const debates = readDebates();
  const index = debates.findIndex((d: any) => d.id === session.id);
  if (index >= 0) {
    debates[index] = session;
  } else {
    debates.push(session);
  }
  writeDebates(debates);
  res.json({ success: true, session });
});

// Delete a debate session
app.delete("/api/debates/:id", (req, res) => {
  const debates = readDebates();
  const filtered = debates.filter((d: any) => d.id !== req.params.id);
  writeDebates(filtered);
  res.json({ success: true });
});

// 1. Spawn N Specialized Scientific Agents with Conflicting Objectives across the 4 Epistemic Lenses

// Helper function to invoke either local Ollama Llama 3.2 or Gemini with robust fallback
interface CallLLMParams {
  modelEngine: string;
  prompt: string;
  systemInstruction: string;
  schema: any;
}

function stripFences(s: string): string {
  const t = s.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1] : t;
}

// OpenCode Go (`/zen/go/v1`) requires an `x-opencode-session` header; a stable
// per-process id is enough. Harmless on plain OpenAI-compatible endpoints too.
const OPENAI_SESSION = process.env.OPENAI_SESSION || (globalThis.crypto?.randomUUID?.() ?? `discourse-${Date.now()}`);

/** Close any braces/brackets left open by a truncated model response. */
function closeOpen(s: string): string {
  let inStr = false, esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { if (inStr) esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if (ch === '}' || ch === ']') stack.pop();
  }
  let out = s;
  if (inStr) out += '"';
  return out + stack.reverse().join('');
}

/**
 * Best-effort salvage of JSON from a model that truncated or wrapped its output.
 * Required because large schemas (the judge dossier) can exceed an endpoint's
 * max output tokens; a truncated tail is dropped and the structures closed.
 */
function repairJson(raw: string): string {
  let s = stripFences(raw);
  const starts = ['{', '['].map((c) => s.indexOf(c)).filter((i) => i >= 0);
  if (starts.length) s = s.slice(Math.min(...starts));
  for (let i = 0; i < 60; i++) {
    try { JSON.parse(s); return s; } catch (e) {
      const msg = (e as Error).message;
      const m = /position (\d+)/.exec(msg);
      if (!m) break;
      const pos = Number(m[1]);
      if (/Expected ':'/.test(msg)) s = s.slice(0, pos) + ':' + s.slice(pos);
      else s = closeOpen(s.slice(0, pos).replace(/[,\s]+$/, ''));
    }
  }
  return s;
}

/** Parse a JSON array, tolerating an object wrapper (e.g. {"agents":[...]}) from JSON-mode. */
function parseArray<T>(raw: string): T[] {
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v as T[];
    if (v && typeof v === 'object') {
      const arr = Object.values(v as Record<string, unknown>).find(Array.isArray);
      if (arr) return arr as T[];
    }
  } catch { /* fall through */ }
  return [];
}

async function callLLM({ modelEngine, prompt, systemInstruction, schema }: CallLLMParams): Promise<string> {
  // OpenAI-compatible engine — the ecosystem's model access (opencode zen /
  // ollama-cloud / openrouter / LiteLLM). Requires OPENAI_API_KEY (+ optional
  // OPENAI_BASE_URL / OPENAI_MODEL) and does NOT need a Gemini key.
  if (modelEngine === 'openai') {
    const base = (process.env.OPENAI_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/+$/, '');
    const key = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'space-bunny-free';
    if (!key) throw new Error('openai engine: OPENAI_API_KEY not configured');
    const messages = [
      {
        role: 'system',
        content: `${systemInstruction}\nRespond with ONLY minified JSON matching this JSON Schema exactly (no prose, no code fences):\n${JSON.stringify(schema)}`,
      },
      { role: 'user', content: prompt },
    ];
    let content = '';
    let lastErr = '';
    // Ask the provider to enforce the JSON schema (probe-confirmed on LiteLLM);
    // fall back to a plain call if the provider rejects json_schema (400).
    const responseFormat = schema ? { type: 'json_schema', json_schema: { name: 'discourse', schema } } : undefined;
    let useFormat = !!responseFormat;
    // Retry on a transient empty completion / non-2xx (the Go tier occasionally
    // returns an empty body mid-debate; one retry keeps a round from collapsing).
    for (let attempt = 0; attempt < 3 && !content; attempt++) {
      const payload: Record<string, unknown> = { model, max_tokens: Number(process.env.OPENAI_MAX_TOKENS ?? 8192), messages, temperature: 0.3 };
      if (useFormat && responseFormat) payload.response_format = responseFormat;
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'x-opencode-session': OPENAI_SESSION },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(180000),
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => '')).slice(0, 200);
        if (res.status === 400 && useFormat) { useFormat = false; lastErr = 'json_schema rejected; retrying without'; continue; }
        lastErr = `HTTP ${res.status}: ${body}`;
        continue;
      }
      const j: any = await res.json().catch(() => null);
      content = j?.choices?.[0]?.message?.content ?? '';
      if (!content) { lastErr = 'empty completion'; await new Promise((r) => setTimeout(r, 600)); }
    }
    if (!content) throw new Error(`openai engine: ${lastErr || 'empty completion'}`);
    return repairJson(String(content));
  }

  if (modelEngine === 'llama') {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
    const schemaString = JSON.stringify(schema, null, 2);
    const llamaPrompt = `${prompt}\n\nYOU MUST RESPOND IN STRICT JSON MATCHING THIS EXACT SCHEMA:\n${schemaString}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          prompt: llamaPrompt,
          system: systemInstruction,
          stream: false,
          format: 'json'
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        if (data && data.response) {
          return data.response;
        }
      }
    } catch (err: any) {
      console.warn(`[Llama Engine] Connection to ${ollamaUrl} failed (${err.message}). Falling back to Gemini 3.7 with Llama-3.2 system instruction formatting.`);
    }

    // Graceful fallback to Gemini 3.7 Flash with Llama-3.2 emulation system instructions
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: `[LLAMA-3.2 EMULATION MODE]\nAct as a Llama-3.2 90B Instruct / Open-Weights Scientific Engine.\n${systemInstruction}`,
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });

    return response.text || "";
  } else {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema as any,
      },
    });

    return response.text || "";
  }
}

// Endpoint to check Ollama Llama status
app.get("/api/llama/status", async (req, res) => {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const checkRes = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (checkRes.ok) {
      const data = await checkRes.json();
      res.json({
        status: 'connected',
        engine: 'Ollama Llama3.2',
        url: ollamaUrl,
        model: ollamaModel,
        availableModels: data.models ? data.models.map((m: any) => m.name) : [],
      });
      return;
    }
  } catch (err) {
    // Suppress network error
  }

  res.json({
    status: 'cloud_emulated',
    engine: 'Llama 3.2 Instruct (Emulated)',
    url: ollamaUrl,
    model: 'llama3.2-gemini-fallback',
  });
});

// Auto-generate Research Brief Constraints
app.post("/api/debate/generate-brief", async (req, res) => {
  try {
    const { topic, modelEngine = DEFAULT_ENGINE } = req.body;

    const prompt = `
      You are an expert scientific trial designer and epistemologist.
      Given the topic: "${topic}"
      
      Generate a structured research brief that sets strict constraints for a computational debate.
      Do not invent fake data. Frame the hypothesis, primary outcome, and evidence constraints perfectly.
    `;

    const systemInstruction = "You are a rigorous clinical trial designer.";
    
    const schema = {
      type: Type.OBJECT,
      properties: {
        question: { type: Type.STRING },
        population_or_system: { type: Type.STRING },
        primary_outcome: { type: Type.STRING },
        candidate_mechanism: { type: Type.STRING },
        allowed_evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
        excluded_evidence: { type: Type.ARRAY, items: { type: Type.STRING } },
        success_criterion: { type: Type.STRING }
      },
      required: ["question", "population_or_system", "primary_outcome", "candidate_mechanism", "allowed_evidence", "excluded_evidence", "success_criterion"]
    };

    const textText = await callLLM({ modelEngine, prompt, systemInstruction, schema });

    if (!textText) {
      throw new Error("Failed to generate brief.");
    }

    const brief = JSON.parse(textText);
    res.json(brief);
  } catch (err) {
    console.error("Error generating brief:", err);
    res.status(500).json({ error: "Failed to generate brief" });
  }
});


app.post("/api/debate/spawn-agents", async (req, res) => {
  try {
    const { topic, numAgents = 6, format = "roundtable", materials = "", stanceCards = [], researchBrief, modelEngine = DEFAULT_ENGINE, recommendedPersonas = [] } = req.body;

    const activeStanceCardsText = stanceCards
      .filter((sc: any) => sc.isActive)
      .map((sc: any) => `Stance [${sc.lens || 'General'}]: "${sc.title}" - Claim: "${sc.claim}" - Reasoning: "${sc.reasoning}"`)
      .join("\n");

    const recommendedPersonasText = recommendedPersonas && recommendedPersonas.length > 0 ? `
=== RECOMMENDED PERSONA ARCHETYPES TO INSTANTIATE ===
The motion/scenario calls for the following specific character roles and conflicting objectives. You MUST instantiate these personas or closely aligned variations:
${recommendedPersonas.map((p: any) => `- Role: "${p.role}" | Description: "${p.description}" | Primary Lens: "${p.primaryLens}"`).join('\n')}
===================================================
` : "";

    const researchBriefText = researchBrief ? `
=== STRUCTURED RESEARCH BRIEF (MACHINE-READABLE SPECIFICATION) ===
Question: "${researchBrief.question}"
Target Population / Model System: "${researchBrief.population_or_system}"
Primary Endpoint Outcome: "${researchBrief.primary_outcome}"
Candidate Biological Mechanism: "${researchBrief.candidate_mechanism}"
Allowed Evidence Types: ${JSON.stringify(researchBrief.allowed_evidence)}
Excluded / Disallowed Evidence: ${JSON.stringify(researchBrief.excluded_evidence)}
Preregistered Success / Replication Criterion: "${researchBrief.success_criterion}"
=================================================================
` : "";

    const prompt = `
      You are the Scientific Accountability Multi-Agent Debate (MAD) Spawning Orchestrator.
      You must spawn exactly ${numAgents} specialized scientific agents with CONFLICTING INCENTIVES to evaluate this research question:
      "${topic}"

      ${recommendedPersonasText}

      ${researchBriefText}

      Grounding Materials & Oncology Benchmarks:
      "${materials}"

      ${activeStanceCardsText ? `Active Stance Cards:\n${activeStanceCardsText}` : ""}

      SCIENTIFIC ACCOUNTABILITY ARCHITECTURE & CONFLICTING OBJECTIVES:
      Do NOT spawn generic general-purpose debate agents. Assign specialized scientific roles with conflicting incentives to prevent catastrophic failure modes:
      
      Available Specialized Scientific Roles to distribute across the ${numAgents} agents:
      1. 'literature_mapper': Evidence map, key papers, contradictory findings, data availability (Prevents: Cherry-picking familiar studies).
      2. 'mechanism_builder': Causal DAG/diagram, biophysical signaling, and molecular rationale (Prevents: Mistaking correlation for mechanism).
      3. 'adversarial_critic': Alternative explanations, confounders, failed predictions, negative studies (Prevents: Consensus bias; penalized for easy agreement, rewarded for discovering viable counter-hypotheses).
      4. 'methods_reviewer': Power analysis, controls, endpoints, analysis plan, leakage checks (Prevents: Underpowered or invalid experiments).
      5. 'novelty_examiner': Similarity search across papers, reviews, patents, preprints, trials (Prevents: Repackaging an existing idea as new).
      6. 'translational_reviewer': Model validity, cross-species translation, safety, clinical relevance (Prevents: Overclaiming from cell lines or mice).
      7. 'synthesis_editor': Ranked hypothesis cards with an exhaustive claim-evidence audit (Prevents: Persuasive but uncheckable prose).

      EPISTEMIC QUAD-LENS INTEGRATION:
      Ensure agents also span the 4 Epistemic Lenses:
      - 🔬 Scientific / Empirical (Biomarkers, single-cell multi-omics, trial endpoints)
      - 📐 Mathematical / Dynamical (Evolutionary game theory, Lotka-Volterra competition, bifurcation models)
      - 🏛️ Philosophical / Epistemological (Reductionist limits, causal inference, ontological boundaries)
      - ⚖️ Moral / Bioethical (QALY preservation, maximum tolerated dose toxicity, overdiagnosis bias)

      CRITICAL SPAWNING RULES:
      - Give each agent an explicit 'scientificRole', a 'conflictingObjective', and a 'failureModeGuarded'.
      - Set divergent initialPositions (-1.0 to +1.0) with calibrated initial confidence (0-100%).
      - Assign realistic professional titles and disciplines (e.g., "Adversarial Biostatistician & Confounder Lead", "Spatial Proteogenomics & Single-Cell Epigeneticist").
    `;

    const systemInstruction = "You are an advanced scientific discovery orchestration engine. You enforce rigorous scientific accountability, conflicting objectives, and structured falsification.";

    const spawnSchema = {
      type: Type.ARRAY,
      description: "List of spawned specialized scientific agent personas",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Full professional name of the scientist" },
          avatar: { type: Type.STRING, description: "A single emoji representing their archetype" },
          role: { type: Type.STRING, description: "Professional role title" },
          scientificRole: { 
            type: Type.STRING, 
            enum: [
              "literature_mapper",
              "mechanism_builder",
              "adversarial_critic",
              "methods_reviewer",
              "novelty_examiner",
              "translational_reviewer",
              "synthesis_editor"
            ],
            description: "The specialized scientific role"
          },
          conflictingObjective: { type: Type.STRING, description: "Their distinct conflicting optimization incentive" },
          failureModeGuarded: { type: Type.STRING, description: "The specific cognitive failure mode they are built to prevent" },
          formalDiscipline: { type: Type.STRING, description: "Academic discipline" },
          primaryLens: { 
            type: Type.STRING, 
            enum: ["scientific", "mathematical", "philosophical", "moral"],
            description: "Primary epistemic lens" 
          },
          secondaryLens: { 
            type: Type.STRING, 
            enum: ["scientific", "mathematical", "philosophical", "moral"],
            description: "Secondary epistemic lens" 
          },
          bio: { type: Type.STRING, description: "Academic background" },
          stanceBrief: { type: Type.STRING, description: "Starting position summary" },
          initialPosition: { type: Type.NUMBER, description: "Starting position from -1.0 to +1.0" },
          initialConfidence: { type: Type.INTEGER, description: "Confidence 0 to 100" },
          reasoningStyle: { type: Type.STRING, description: "Epistemic reasoning style" },
        },
        required: ["name", "avatar", "role", "scientificRole", "conflictingObjective", "failureModeGuarded", "formalDiscipline", "primaryLens", "bio", "stanceBrief", "initialPosition", "initialConfidence", "reasoningStyle"],
      },
    };

    const textText = await callLLM({
      modelEngine,
      prompt,
      systemInstruction,
      schema: spawnSchema,
    });

    if (!textText) {
      throw new Error("No response from AI API.");
    }

    const agents = parseArray<any>(textText).map((a: any, i: number) => ({
      ...a,
      id: `agent_${Date.now()}_${i}`,
    }));

    res.json(agents);
  } catch (err: any) {
    console.error("Error spawning agents:", err);
    res.status(500).json({ error: err.message || "Failed to spawn agents" });
  }
});

// 2. Run a single agent's turn in a debate round with Structured Claim Cards and Falsification
app.post("/api/debate/agent-turn", async (req, res) => {
  try {
    const {
      topic,
      format,
      materials,
      agents,
      agentId,
      rounds,
      currentRoundIndex,
      researchBrief,
      timeWindowSeconds = 45,
      elapsedSessionSeconds = 0,
      enforceLengthByTime = true,
      toneStyle = 'intellectual',
      modelEngine = DEFAULT_ENGINE,
    } = req.body;

    const currentAgent = agents.find((a: any) => a.id === agentId);
    if (!currentAgent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    // Target word budget calibrated to speaking time window (~140-160 words/min)
    const targetWordsMax = Math.min(320, Math.max(60, Math.round((timeWindowSeconds / 60) * 150)));

    // Build history text
    let debateHistoryText = "";
    rounds.forEach((round: any, rIdx: number) => {
      debateHistoryText += `\n--- ROUND ${rIdx + 1}: ${round.name} ---\n`;
      if (round.userInterjection) {
        debateHistoryText += `[USER PROXY INTERJECTION]: "${round.userInterjection}"\n`;
      }
      round.statements.forEach((stmt: any) => {
        debateHistoryText += `${stmt.agentName} (${stmt.role} [${stmt.scientificRole || 'scientist'}]) [Primary Lens: ${stmt.activeLenses?.join(", ") || "General"}] said:\n"${stmt.statementText}"\nStance Position: ${Number(stmt.updatedPosition ?? 0) > 0 ? "Supportive" : "Opposed"} (${Number(stmt.updatedPosition ?? 0).toFixed(2)})\n`;
        if (stmt.evaluatedClaim) {
          debateHistoryText += `  [Claim Card]: "${stmt.evaluatedClaim.claim}" (Type: ${stmt.evaluatedClaim.claimType}, Tier: ${stmt.evaluatedClaim.evidenceTier}, Conf: ${stmt.evaluatedClaim.confidence})\n`;
        }
        if (stmt.falsificationAttempt) debateHistoryText += `  [Falsification Attempt]: ${stmt.falsificationAttempt}\n`;
        if (stmt.mathematicalGrounding) debateHistoryText += `  [Math]: ${stmt.mathematicalGrounding}\n`;
        if (stmt.philosophicalPrinciple) debateHistoryText += `  [Philosophy]: ${stmt.philosophicalPrinciple}\n`;
        if (stmt.moralTradeoff) debateHistoryText += `  [Moral/Ethics]: ${stmt.moralTradeoff}\n`;
        if (stmt.empiricalEvidence) debateHistoryText += `  [Empirical]: ${stmt.empiricalEvidence}\n`;
        debateHistoryText += `\n`;
      });
    });

    const currentRound = rounds[currentRoundIndex];
    const currentRoundInterjection = currentRound?.userInterjection;
    const statementsInCurrentRound = currentRound?.statements || [];
    let currentRoundProgressText = "";
    if (currentRoundInterjection) {
      currentRoundProgressText += `[USER PROXY INTERJECTION in this current round]: "${currentRoundInterjection}"\n`;
    }
    statementsInCurrentRound.forEach((stmt: any) => {
      currentRoundProgressText += `${stmt.agentName} (${stmt.role}) said:\n"${stmt.statementText}"\nStance Position: ${Number(stmt.updatedPosition ?? 0).toFixed(2)}\n\n`;
    });

    const isRound1 = currentRoundIndex === 0;

    const researchBriefConstraints = researchBrief ? `
RESEARCH BRIEF BOUNDARIES (DO NOT DRIFT):
- Question: "${researchBrief.question}"
- Model System: "${researchBrief.population_or_system}" (Do not swap animal models or cell lines for human clinical claims without explicit translational caveats)
- Primary Outcome: "${researchBrief.primary_outcome}"
- Candidate Mechanism: "${researchBrief.candidate_mechanism}"
- Allowed Evidence: ${JSON.stringify(researchBrief.allowed_evidence)}
- Excluded Evidence: ${JSON.stringify(researchBrief.excluded_evidence)}
- Success Criterion: "${researchBrief.success_criterion}"
` : "";

    const prompt = `
      You are simulating the scientist persona "${currentAgent.name}" in a high-rigor Scientific Accountability Debate.
      
      YOUR SCIENTIFIC PERSONA & CONFLICTING INCENTIVE:
      - Role: ${currentAgent.role} (${currentAgent.scientificRole})
      - Conflicting Objective: ${currentAgent.conflictingObjective || "Strict empirical falsification"}
      - Failure Mode You Guard Against: ${currentAgent.failureModeGuarded || "Consensus bias and unverified claims"}
      - Discipline: ${currentAgent.formalDiscipline}
      - Primary Lens: ${currentAgent.primaryLens} | Secondary Lens: ${currentAgent.secondaryLens || "General"}
      - Reasoning Style: ${currentAgent.reasoningStyle}
      - Stance: ${currentAgent.stanceBrief}

      ${researchBriefConstraints}

      TIME WINDOW & PACING DISCIPLINE:
      - Allocated Response Time Window: ${timeWindowSeconds} SECONDS.
      - Maximum spoken word limit: ${targetWordsMax} words.
      - Time Discipline: Deliver a concentrated, high-density argument that fits strictly inside this ${timeWindowSeconds}s response window. No rhetorical filler.

      DEBATE CONTEXT:
      - Topic: "${topic}"
      - Format: "${format}"
      - Reference Materials: "${materials}"

      DEBATE TRANSCRIPT SO FAR:
      ${debateHistoryText || "No previous rounds completed."}

      CURRENT ROUND PROGRESS (Round ${currentRoundIndex + 1}):
      ${currentRoundProgressText || "You are the first speaker in this round."}

      EPISTEMIC RIGOR GUARDRAILS (STRICT COMPLIANCE REQUIRED):
      1. Source Validation: No citation, no claim. Provide PMIDs, DOIs, or exact dataset names. Flag any retracted or non-primary sources.
      2. Entity Disambiguation: Explicitly specify gene aliases, protein isoforms, chemical structures, and species (e.g. human vs murine).
      3. Evidence Hierarchy: Never conflate cell-line/in vitro experiments with clinical validation.
      4. Causal-Language Control: If citing observational data using causal verbs (drives, causes, prevents), you MUST set causalLanguageWarning.
      5. Numerical Fidelity: Extract and preserve n, effect directions, CI, p-values, doses, and timepoints. NEVER paraphrase important quantitative details.
      6. Uncertainty & Abstention: If there is insufficient evidence, explicitly abstain (set abstentionFlag to true) rather than hallucinating.

      TONE & VOCABULARY STYLE:
      You MUST write your spoken statement in the "${toneStyle}" style:
      - "intellectual": Highly academic, rigorous, dense jargon, formal peer-review tone.
      - "layman": Simple, accessible metaphors, clear analogies, 8th-grade reading level but accurate.
      - "authoritative": Extremely confident, blunt, commanding, decisive, no-nonsense.
      - "slang": Gen-Z internet slang, highly informal, edgy, casual but still conveying the scientific point.

      DIRECTIVE FOR THIS ROUND:
      1. Speak in the first person matching your specialized scientific role.
      2. Keep spoken statement under ${targetWordsMax} words: direct, unvarnished, mathematically and biologically grounded.
      3. ${isRound1 ? "Round 1 (Proposal & Evidence Mapping): Propose your core claim card with primary evidence, exact model system, and testable predictions." : "Round " + (currentRoundIndex + 1) + " (Adversarial Falsification & Stress-Testing): Attack weak assumptions in prior statements. Propose concrete falsifiers, confounders, power flaws, or translational hazards."}
      4. GENERATE A STANDARDIZED CLAIM CARD:
         - Formulate a precise 'claim' (Causal, Associational, Translational, or Methodological).
         - Provide structured 'evidence' items: Study ID (e.g. 'Nature-2022-EMT', 'TCGA-BRCA'), quoted passage/data, exact experimental system, effect size, sample size, and evidence tier (Tier 1: Independent Replication, Tier 2: Prospective Clinical/Trial, Tier 3: Observational Multi-omics, Tier 4: Preclinical animal/organoid, Tier 5: Computational/Plausibility). Note: Agent agreement = Tier 0 (zero evidence).
         - Provide 'counterevidence' and 'alternativeExplanations' (e.g., cell-line artifact, sampling heterogeneity, stromal confounding).
         - Define an exact 'testablePrediction' and 'falsifier' (what prospective experiment or data would prove this claim false).
         - Calibrated 'confidence' (0.0 to 1.0) with explicit uncertainty rationale.
         - Follow ALL Epistemic Rigor Guardrails (Citations, Numerical Fidelity, Disambiguation).
      5. Provide Quad-Lens anchors (Math grounding, Philosophical principle, Moral/QALY trade-off, Empirical evidence).
    `;

    const systemInstruction = "You are a world-class oncology and computational biology multi-agent simulation system. Every claim must be traceable, falsifiable, calibrated, and obey strict epistemological constraints. Do not paraphrase away numbers. Abstain when uncertain.";

    const turnSchema = {
      type: Type.OBJECT,
      properties: {
        statementText: { type: Type.STRING, description: "Spoken argument (under 130 words)" },
        activeLenses: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING, enum: ["scientific", "mathematical", "philosophical", "moral"] },
          description: "Epistemic lenses activated" 
        },
        evaluatedClaim: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "Unique claim ID" },
            claim: { type: Type.STRING, description: "Specific falsifiable proposition" },
            claimType: { 
              type: Type.STRING, 
              enum: ["Causal / Mechanistic", "Associational / Biomarker", "Translational / Interventional", "Methodological / Epistemic"] 
            },
            evidence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  studyId: { type: Type.STRING, description: "Study citation or trial ID" },
                  passageOrFinding: { type: Type.STRING, description: "Specific quoted passage, figure, or assay finding" },
                  experimentalSystem: { type: Type.STRING, description: "Exact model (e.g. Human TNBC cohort, PDX, Organoid)" },
                  effectSize: { type: Type.STRING, description: "Quantified effect (e.g. HR=2.4, p<0.001)" },
                  uncertaintyInterval: { type: Type.STRING, description: "95% CI or p-value" },
                  sampleSize: { type: Type.STRING, description: "Sample size (e.g. N=340)" },
                  tier: { type: Type.INTEGER, description: "Evidence Tier 1, 2, 3, 4, or 5" }
                },
                required: ["id", "studyId", "passageOrFinding", "experimentalSystem", "tier"]
              }
            },
            counterevidence: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  studyId: { type: Type.STRING },
                  conflictingFinding: { type: Type.STRING },
                  contextDifferences: { type: Type.STRING },
                  tier: { type: Type.INTEGER }
                },
                required: ["id", "studyId", "conflictingFinding", "contextDifferences", "tier"]
              }
            },
            alternativeExplanations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Confounders, cell-line artifacts, sampling bias"
            },
            testablePrediction: { type: Type.STRING, description: "Concrete prospective prediction" },
            falsifier: { type: Type.STRING, description: "Decisive falsification criterion" },
            confidence: { type: Type.NUMBER, description: "Calibrated probability 0.0 to 1.0" },
            confidenceRationale: { type: Type.STRING, description: "Key sources of epistemic uncertainty" },
            evidenceTier: { type: Type.INTEGER, description: "Highest evidence tier supporting claim" },
            status: { type: Type.STRING, enum: ["supported", "contested", "falsified", "candidate"] },
            sourceCitations: { type: Type.ARRAY, items: { type: Type.STRING } },
            causalLanguageWarning: { type: Type.STRING },
            numericalFidelity: {
              type: Type.OBJECT,
              properties: {
                sampleSize: { type: Type.STRING },
                effectDirection: { type: Type.STRING },
                confidenceInterval: { type: Type.STRING },
                pValue: { type: Type.STRING },
                doseOrTimepoint: { type: Type.STRING }
              }
            },
            entityDisambiguation: { type: Type.ARRAY, items: { type: Type.STRING } },
            abstentionFlag: { type: Type.BOOLEAN }
          },
          required: ["id", "claim", "claimType", "evidence", "counterevidence", "alternativeExplanations", "testablePrediction", "falsifier", "confidence", "confidenceRationale", "evidenceTier", "status"]
        },
        falsificationAttempt: { type: Type.STRING, description: "Concrete attempt to falsify peer claim or point out critical confounders" },
        uncertaintySource: { type: Type.STRING, description: "Explicit reason for residual uncertainty" },
        evidenceTierCited: { type: Type.INTEGER, description: "Tier of evidence cited (1 to 5)" },
        mathematicalGrounding: { type: Type.STRING, description: "Mathematical formula, dynamical ODE, or statistical principle" },
        philosophicalPrinciple: { type: Type.STRING, description: "Epistemological axiom" },
        moralTradeoff: { type: Type.STRING, description: "Bioethical or QALY trade-off" },
        empiricalEvidence: { type: Type.STRING, description: "Specific biological citation" },
        updatedPosition: { type: Type.NUMBER, description: "Position -1.0 to +1.0" },
        updatedConfidence: { type: Type.INTEGER, description: "Confidence 0 to 100%" },
        reasonForUpdate: { type: Type.STRING, description: "Internal cognitive monologue" },
        critiqueTarget: { type: Type.STRING, description: "Name of scientist critiqued" },
      },
      required: [
        "statementText",
        "activeLenses",
        "evaluatedClaim",
        "falsificationAttempt",
        "uncertaintySource",
        "evidenceTierCited",
        "mathematicalGrounding",
        "philosophicalPrinciple",
        "moralTradeoff",
        "empiricalEvidence",
        "updatedPosition",
        "updatedConfidence",
        "reasonForUpdate",
        "critiqueTarget",
      ],
    };

    const textText = await callLLM({
      modelEngine,
      prompt,
      systemInstruction,
      schema: turnSchema,
    });

    if (!textText) {
      throw new Error("Failed to receive agent response.");
    }

    const statementResult = JSON.parse(textText);

    // Compute delivery metrics & time window adherence
    const wordCount = (statementResult.statementText || "").trim().split(/\s+/).filter(Boolean).length;
    // Standard speaking speed: ~150 wpm
    const estimatedDurationSeconds = Math.max(10, Math.min(Math.round((wordCount / 150) * 60), timeWindowSeconds * 1.5));
    
    let timeStatus: 'within_window' | 'warning_extended' | 'budget_exceeded' = 'within_window';
    if (estimatedDurationSeconds > timeWindowSeconds * 1.15) {
      timeStatus = 'budget_exceeded';
    } else if (estimatedDurationSeconds > timeWindowSeconds) {
      timeStatus = 'warning_extended';
    }

    const elapsedMinutes = Math.floor(elapsedSessionSeconds / 60);
    const elapsedSecsRemainder = elapsedSessionSeconds % 60;
    const timestampStr = `T+${String(elapsedMinutes).padStart(2, '0')}:${String(elapsedSecsRemainder).padStart(2, '0')}`;

    const timingData = {
      timestamp: timestampStr,
      elapsedSessionSeconds,
      allocatedSeconds: Number(timeWindowSeconds) || 45,
      durationSeconds: estimatedDurationSeconds,
      timeStatus,
      speakingPaceWpm: Math.round((wordCount / (estimatedDurationSeconds / 60))) || 150,
    };

    res.json({
      agentId,
      agentName: currentAgent.name,
      avatar: currentAgent.avatar,
      role: currentAgent.role,
      scientificRole: currentAgent.scientificRole,
      roundIndex: currentRoundIndex,
      ...statementResult,
      timing: timingData,
    });
  } catch (err: any) {
    console.error("Error on agent turn:", err);
    res.status(500).json({ error: err.message || "Failed to execute agent turn" });
  }
});

// 3. Run Synthesis & Experimental Falsification Judge
app.post("/api/debate/judge", async (req, res) => {
  try {
    const { topic, format, materials, agents, rounds, researchBrief, modelEngine = DEFAULT_ENGINE } = req.body;

    let fullTranscript = "";
    rounds.forEach((round: any, rIdx: number) => {
      fullTranscript += `\n=== ROUND ${rIdx + 1}: ${round.name} ===\n`;
      if (round.userInterjection) {
        fullTranscript += `[USER INTERJECTION]: "${round.userInterjection}"\n`;
      }
      round.statements.forEach((stmt: any) => {
        fullTranscript += `${stmt.agentName} (${stmt.role} [${stmt.scientificRole || 'Scientist'}]) [Pos: ${Number(stmt.updatedPosition ?? 0).toFixed(2)}, Conf: ${stmt.updatedConfidence ?? '?'}%]\n`;
        fullTranscript += `Spoken: "${stmt.statementText}"\n`;
        if (stmt.evaluatedClaim) {
          fullTranscript += `Claim: "${stmt.evaluatedClaim.claim}" (Type: ${stmt.evaluatedClaim.claimType}, Tier: ${stmt.evaluatedClaim.evidenceTier}, Conf: ${stmt.evaluatedClaim.confidence})\n`;
          fullTranscript += `  Falsifier: ${stmt.evaluatedClaim.falsifier}\n`;
        }
        if (stmt.falsificationAttempt) fullTranscript += `Falsification Attempt: ${stmt.falsificationAttempt}\n`;
        if (stmt.mathematicalGrounding) fullTranscript += `Math: ${stmt.mathematicalGrounding}\n`;
        if (stmt.philosophicalPrinciple) fullTranscript += `Philosophy: ${stmt.philosophicalPrinciple}\n`;
        if (stmt.moralTradeoff) fullTranscript += `Ethics: ${stmt.moralTradeoff}\n`;
        if (stmt.empiricalEvidence) fullTranscript += `Evidence: ${stmt.empiricalEvidence}\n`;
        fullTranscript += `\n`;
      });
    });

    // Cap the transcript so the judge request cannot exceed the provider's body
    // limit (OpenCode Go returned HTTP 413 on a full multi-agent transcript).
    fullTranscript = fullTranscript.slice(0, 12000);

    const researchBriefSpec = researchBrief ? `
      RESEARCH BRIEF SPECIFICATION:
- Question: "${researchBrief.question}"
- Model System: "${researchBrief.population_or_system}"
- Primary Outcome: "${researchBrief.primary_outcome}"
- Candidate Mechanism: "${researchBrief.candidate_mechanism}"
- Success Criterion: "${researchBrief.success_criterion}"
` : "";

    const prompt = `
      You are the Master Scientific Synthesis & Experimental Planning Judge.
      Your task is to convert this Multi-Agent Scientific Debate into an auditable, uncertainty-calibrated HYPOTHESIS-DISCOVERY AND EXPERIMENTAL-PLANNING DOSSIER.

      ${researchBriefSpec}

      GROUNDING MATERIALS:
      "${materials}"

      FULL DEBATE TRANSCRIPT:
      ${fullTranscript}

      CORE SCIENTIFIC ACCOUNTABILITY PRINCIPLES:
      1. AGENT AGREEMENT = ZERO INDEPENDENT EVIDENCE. Do not declare a hypothesis "true" or "discovered" because agents agreed. Treat all conclusions as CANDIDATE HYPOTHESES awaiting independent laboratory or clinical replication.
      2. PRESERVE DISAGREEMENT & MINORITY REPORTS. Extract explicit minority reports detailing dissent and unaddressed evidence gaps.
      3. RANK CANDIDATE HYPOTHESES: Generate at least 2 ranked Candidate Hypotheses (Rank 1, Rank 2) with calibrated probabilities (e.g. 0.45) and uncertainty sources.
      4. GENERATE PREREGISTERED EXPERIMENTAL PROTOCOLS: For each candidate hypothesis, produce a structured, actionable laboratory study design:
         - Proposed Perturbation (CRISPR KO, shRNA, targeted degrader/inhibitor, etc.)
         - Biological Model System (Patient-derived organoids, humanized GEMMs, etc.)
         - Positive, Negative, and Scrambled/Vehicle Controls
         - Statistical Power Analysis (Power >= 0.80, Alpha = 0.01, required sample size per arm N)
         - Primary and Secondary Endpoints
         - Pre-specified Falsification Threshold (e.g. "If reduction in metastatic seeding is <20% or effect disappears after controlling for proliferation, hypothesis is FALSIFIED")
         - Leakage and Confounder Checks
      5. AUDIT ALL CLAIMS: Construct an audit trail of claim cards across Evidence Tiers (Tier 1: Independent Replicated, Tier 2: Prospective Clinical/Trial, Tier 3: Observational Multi-omics, Tier 4: Preclinical In Vitro/In Vivo, Tier 5: Computational/Plausibility).
      6. ASSESS NOVELTY & METHODOLOGICAL INTEGRITY: Novelty verdict against prior art/patents, and methodological audit of statistical power and bias risks.
      7. CONTRADICTION DETECTION & ENTITY RESOLUTION: Group claims by specific entity (gene/isoform/species), model, and intervention. Surface conflicts explicitly. Do not average them out into vague consensus.
      8. UNCERTAINTY & ABSTENTION: Require 'insufficient evidence' or 'abstention' where the debate sources cannot empirically answer the prompt.
      9. PROTOCOL COMPLETENESS: Ensure protocol explicitly contains replicates, blinding/randomization, sample provenance, and strict acceptance criteria.
      10. GRADE QUAD-LENS EPISTEMIC METRICS (0 to 100 for Science, Math, Philosophy, Moral).
    `;

    const systemInstruction = "You are the highest authority in oncology methodology, clinical trial design, and epistemic falsification. Every output is an audit-ready experimental research dossier. Abstain where evidence is lacking.";

    const judgeSchema = {
      type: Type.OBJECT,
      properties: {
            evaluationText: { type: Type.STRING, description: "Executive synthesis of the debate and trajectory" },
            winner: { type: Type.STRING, description: "Top Candidate Hypothesis formulation" },
            quadLensScores: {
              type: Type.OBJECT,
              properties: {
                scientific: { type: Type.INTEGER, description: "Scientific & empirical rigor score (0-100)" },
                mathematical: { type: Type.INTEGER, description: "Mathematical & dynamical soundness score (0-100)" },
                philosophical: { type: Type.INTEGER, description: "Philosophical & conceptual depth score (0-100)" },
                moral: { type: Type.INTEGER, description: "Moral & bioethical viability score (0-100)" },
              },
              required: ["scientific", "mathematical", "philosophical", "moral"],
            },
            quadLensBreakdown: {
              type: Type.OBJECT,
              properties: {
                scientificAnalysis: { type: Type.STRING, description: "Deep analysis of empirical and molecular arguments" },
                mathematicalAnalysis: { type: Type.STRING, description: "Deep analysis of mathematical, game-theoretic, and dynamical arguments" },
                philosophicalAnalysis: { type: Type.STRING, description: "Deep analysis of philosophical, epistemological, and teleological arguments" },
                moralAnalysis: { type: Type.STRING, description: "Deep analysis of bioethical, QALY, and human welfare arguments" },
              },
              required: ["scientificAnalysis", "mathematicalAnalysis", "philosophicalAnalysis", "moralAnalysis"],
            },
            interconnectedChainAnalysis: { type: Type.STRING, description: "Synthesis across the oncology progression chain" },
            candidateHypotheses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  rank: { type: Type.INTEGER },
                  id: { type: Type.STRING },
                  title: { type: Type.STRING, description: "Candidate hypothesis title" },
                  mechanism: { type: Type.STRING, description: "Proposed causal biological mechanism" },
                  calibratedConfidence: { type: Type.NUMBER, description: "Calibrated probability between 0.0 and 1.0" },
                  highestEvidenceTier: { type: Type.INTEGER, description: "Highest evidence tier (1-5)" },
                  noveltyScore: { type: Type.INTEGER, description: "Novelty percentage vs prior literature (0-100%)" },
                  priorArtComparison: { type: Type.STRING, description: "Distinction from existing published papers/patents" },
                  claimCards: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        claim: { type: Type.STRING },
                        claimType: { type: Type.STRING },
                        evidence: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              studyId: { type: Type.STRING },
                              passageOrFinding: { type: Type.STRING },
                              experimentalSystem: { type: Type.STRING },
                              effectSize: { type: Type.STRING },
                              sampleSize: { type: Type.STRING },
                              tier: { type: Type.INTEGER }
                            },
                            required: ["id", "studyId", "passageOrFinding", "experimentalSystem", "tier"]
                          }
                        },
                        counterevidence: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              studyId: { type: Type.STRING },
                              conflictingFinding: { type: Type.STRING },
                              contextDifferences: { type: Type.STRING },
                              tier: { type: Type.INTEGER }
                            },
                            required: ["id", "studyId", "conflictingFinding", "contextDifferences", "tier"]
                          }
                        },
                        alternativeExplanations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        testablePrediction: { type: Type.STRING },
                        falsifier: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        confidenceRationale: { type: Type.STRING },
                        evidenceTier: { type: Type.INTEGER },
                        status: { type: Type.STRING },
                        sourceCitations: { type: Type.ARRAY, items: { type: Type.STRING } },
                        causalLanguageWarning: { type: Type.STRING },
                        numericalFidelity: {
                          type: Type.OBJECT,
                          properties: {
                            sampleSize: { type: Type.STRING },
                            effectDirection: { type: Type.STRING },
                            confidenceInterval: { type: Type.STRING },
                            pValue: { type: Type.STRING },
                            doseOrTimepoint: { type: Type.STRING }
                          }
                        },
                        entityDisambiguation: { type: Type.ARRAY, items: { type: Type.STRING } },
                        abstentionFlag: { type: Type.BOOLEAN }
                      },
                      required: ["id", "claim", "claimType", "evidence", "counterevidence", "alternativeExplanations", "testablePrediction", "falsifier", "confidence", "confidenceRationale", "evidenceTier", "status"]
                    }
                  },
                  falsificationProtocol: {
                    type: Type.OBJECT,
                    properties: {
                      hypothesisId: { type: Type.STRING },
                      hypothesisTitle: { type: Type.STRING },
                      targetMechanism: { type: Type.STRING },
                      proposedPerturbation: { type: Type.STRING, description: "Exact molecular or chemical perturbation" },
                      biologicalModelSystem: { type: Type.STRING, description: "Organoid, GEMM, or primary tissue model" },
                      positiveControl: { type: Type.STRING },
                      negativeControl: { type: Type.STRING },
                      vehicleOrScrambledControl: { type: Type.STRING },
                      powerAnalysis: {
                        type: Type.OBJECT,
                        properties: {
                          statisticalPower: { type: Type.NUMBER },
                          alpha: { type: Type.NUMBER },
                          effectSizeEstimate: { type: Type.STRING },
                          requiredSampleSize: { type: Type.STRING },
                        },
                        required: ["statisticalPower", "alpha", "effectSizeEstimate", "requiredSampleSize"]
                      },
                      primaryEndpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                      secondaryEndpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                      leakageAndConfounderChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                      prespecifiedFalsificationThreshold: { type: Type.STRING, description: "Exact quantitative cutoff to reject hypothesis" },
                      timelineAndFeasibility: { type: Type.STRING },
                      replicates: { type: Type.STRING, description: "Biological and technical replicates" },
                      blindingAndRandomization: { type: Type.STRING, description: "Strategy for blinding and randomization" },
                      sampleAndReagentProvenance: { type: Type.STRING, description: "Origin and validation of samples/reagents" },
                      strictAcceptanceCriteria: { type: Type.STRING, description: "Strict criteria for acceptance of results" }
                    },
                    required: ["hypothesisId", "hypothesisTitle", "targetMechanism", "proposedPerturbation", "biologicalModelSystem", "positiveControl", "negativeControl", "vehicleOrScrambledControl", "powerAnalysis", "primaryEndpoints", "secondaryEndpoints", "leakageAndConfounderChecks", "prespecifiedFalsificationThreshold", "timelineAndFeasibility"]
                  }
                },
                required: ["rank", "id", "title", "mechanism", "calibratedConfidence", "highestEvidenceTier", "noveltyScore", "priorArtComparison", "claimCards", "falsificationProtocol"]
              }
            },
            claimAuditTrail: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  claim: { type: Type.STRING },
                  claimType: { type: Type.STRING },
                  evidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        studyId: { type: Type.STRING },
                        passageOrFinding: { type: Type.STRING },
                        experimentalSystem: { type: Type.STRING },
                        tier: { type: Type.INTEGER }
                      },
                      required: ["id", "studyId", "passageOrFinding", "experimentalSystem", "tier"]
                    }
                  },
                  counterevidence: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        studyId: { type: Type.STRING },
                        conflictingFinding: { type: Type.STRING },
                        contextDifferences: { type: Type.STRING },
                        tier: { type: Type.INTEGER }
                      },
                      required: ["id", "studyId", "conflictingFinding", "contextDifferences", "tier"]
                    }
                  },
                  alternativeExplanations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  testablePrediction: { type: Type.STRING },
                  falsifier: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  confidenceRationale: { type: Type.STRING },
                  evidenceTier: { type: Type.INTEGER },
                  status: { type: Type.STRING },
                  sourceCitations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  causalLanguageWarning: { type: Type.STRING },
                  numericalFidelity: {
                    type: Type.OBJECT,
                    properties: {
                      sampleSize: { type: Type.STRING },
                      effectDirection: { type: Type.STRING },
                      confidenceInterval: { type: Type.STRING },
                      pValue: { type: Type.STRING },
                      doseOrTimepoint: { type: Type.STRING }
                    }
                  },
                  entityDisambiguation: { type: Type.ARRAY, items: { type: Type.STRING } },
                  abstentionFlag: { type: Type.BOOLEAN }
                },
                required: ["id", "claim", "claimType", "evidence", "counterevidence", "alternativeExplanations", "testablePrediction", "falsifier", "confidence", "confidenceRationale", "evidenceTier", "status"]
              }
            },
            minorityReports: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING },
                  agentName: { type: Type.STRING },
                  dissentingClaim: { type: Type.STRING },
                  evidenceBasis: { type: Type.STRING },
                  unresolvedGap: { type: Type.STRING },
                },
                required: ["role", "agentName", "dissentingClaim", "evidenceBasis", "unresolvedGap"]
              }
            },
            preregisteredProtocols: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hypothesisId: { type: Type.STRING },
                  hypothesisTitle: { type: Type.STRING },
                  targetMechanism: { type: Type.STRING },
                  proposedPerturbation: { type: Type.STRING },
                  biologicalModelSystem: { type: Type.STRING },
                  positiveControl: { type: Type.STRING },
                  negativeControl: { type: Type.STRING },
                  vehicleOrScrambledControl: { type: Type.STRING },
                  powerAnalysis: {
                    type: Type.OBJECT,
                    properties: {
                      statisticalPower: { type: Type.NUMBER },
                      alpha: { type: Type.NUMBER },
                      effectSizeEstimate: { type: Type.STRING },
                      requiredSampleSize: { type: Type.STRING },
                    },
                    required: ["statisticalPower", "alpha", "effectSizeEstimate", "requiredSampleSize"]
                  },
                  primaryEndpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  secondaryEndpoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  leakageAndConfounderChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  prespecifiedFalsificationThreshold: { type: Type.STRING },
                  timelineAndFeasibility: { type: Type.STRING },
                  replicates: { type: Type.STRING },
                  blindingAndRandomization: { type: Type.STRING },
                  sampleAndReagentProvenance: { type: Type.STRING },
                  strictAcceptanceCriteria: { type: Type.STRING }
                },
                required: ["hypothesisId", "hypothesisTitle", "targetMechanism", "proposedPerturbation", "biologicalModelSystem", "positiveControl", "negativeControl", "vehicleOrScrambledControl", "powerAnalysis", "primaryEndpoints", "secondaryEndpoints", "leakageAndConfounderChecks", "prespecifiedFalsificationThreshold", "timelineAndFeasibility"]
              }
            },
            noveltyVerdict: { type: Type.STRING, description: "Novelty analysis against patents, preprints, and existing literature" },
            methodologicalAudit: {
              type: Type.OBJECT,
              properties: {
                statisticalPowerSummary: { type: Type.STRING },
                leakageAndBiasRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
                controlSufficiency: { type: Type.STRING },
              },
              required: ["statisticalPowerSummary", "leakageAndBiasRisks", "controlSufficiency"]
            },
            contradictionMatrix: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  entity: { type: Type.STRING, description: "Target entity (gene, species, etc.)" },
                  modelOrIntervention: { type: Type.STRING, description: "Experimental model or intervention" },
                  conflictingClaims: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific conflicting findings" }
                },
                required: ["entity", "modelOrIntervention", "conflictingClaims"]
              },
              description: "Surfaces conflicting results rather than averaging into vague consensus"
            },
            abstentionRequired: { type: Type.BOOLEAN, description: "Set to true if there is insufficient evidence to formulate a hypothesis" },
            keyArguments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  point: { type: Type.STRING, description: "The core argument" },
                  strength: { type: Type.INTEGER, description: "Score from 1 to 10" },
                  contributor: { type: Type.STRING, description: "Agent name or role" },
                  lens: { type: Type.STRING, enum: ["scientific", "mathematical", "philosophical", "moral"] },
                },
                required: ["point", "strength", "contributor", "lens"],
              },
            },
            dissent: { type: Type.STRING, description: "Summary of unresolved dissent" },
            openQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Crucial unanswered questions"
            },
            consensusScore: { type: Type.INTEGER, description: "Convergence score from 0 to 100" },
          },
          required: [
            "evaluationText",
            "winner",
            "quadLensScores",
            "quadLensBreakdown",
            "interconnectedChainAnalysis",
            "candidateHypotheses",
            "claimAuditTrail",
            "minorityReports",
            "preregisteredProtocols",
            "noveltyVerdict",
            "methodologicalAudit",
            "keyArguments",
            "dissent",
            "openQuestions",
            "consensusScore",
        ],
      };

    const textText = await callLLM({
      modelEngine,
      prompt,
      systemInstruction,
      schema: judgeSchema,
    });

    if (!textText) {
      throw new Error("Failed to receive judge response.");
    }

    const synthesis = JSON.parse(textText);
    res.json(synthesis);
  } catch (err: any) {
    console.error("Error on judge synthesis:", err);
    res.status(500).json({ error: err.message || "Failed to judge debate" });
  }
});

// Vite middleware for development and static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Quad-Lens MAD Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
