import type { Contribution, DispatchResult, ResearchDirective, ResearchSpec, SystemId } from './types.js';

// ── Contribution extraction ──────────────────────────────────────────────────
// Each system's dispatch body is harvested for SUBSTANCE (papers, insights, data,
// capability). Fail-soft: unknown shapes degrade to a capability note, never throw.

export function extractContribution(r: DispatchResult): Contribution | null {
  const sid = r.systemId;
  if (!r.ok) {
    return { systemId: sid, kind: 'offline', title: `${sid} offline`, detail: r.error ?? 'no response' };
  }
  const body: any = r.body;
  if (!body) {
    return { systemId: sid, kind: 'capability', title: `${sid} reachable`, detail: 'no payload' };
  }

  // overlay-oncology frontier-alignment shape
  if (Array.isArray(body.papers) && body.papers.length) {
    const papers = body.papers.slice(0, 30).map((p: any) => ({
      id: String(p.id ?? ''),
      title: String(p.title ?? ''),
      source: String(p.source ?? ''),
      published: String(p.published ?? ''),
      url: String(p.url ?? ''),
    }));
    const m = body.metrics ?? {};
    return {
      systemId: sid,
      kind: 'literature',
      title: `${sid}: ${papers.length} papers retrieved`,
      detail: `Europe PMC query "${body.query ?? ''}" — ${m.papers_available ?? '?'} available, ${papers.length} ingested after dedup/cap.`,
      papers,
    };
  }

  // frontier_insights (CureMind hypotheses)
  if (Array.isArray(body.frontier_insights) && body.frontier_insights.length) {
    const lines = body.frontier_insights.slice(0, 10).map((h: any) =>
      `• ${h.target ?? '?'} — ${h.mechanism ?? ''} (${h.modality ?? ''}) conf=${h.confidence ?? '?'}`
    ).join('\n');
    return { systemId: sid, kind: 'insight', title: `${sid}: ${body.frontier_insights.length} verified hypotheses`, detail: lines };
  }

  // generic JSON object — describe what it is
  if (typeof body === 'object') {
    if (body.note) return { systemId: sid, kind: 'capability', title: `${sid} ready`, detail: String(body.note) };
    if (body.status) return { systemId: sid, kind: 'capability', title: `${sid} status: ${body.status}`, detail: JSON.stringify(body).slice(0, 400) };
    return { systemId: sid, kind: 'data', title: `${sid} payload`, detail: JSON.stringify(body).slice(0, 600) };
  }
  if (typeof body === 'string' && body.length) {
    return { systemId: sid, kind: 'data', title: `${sid} payload`, detail: body.slice(0, 600) };
  }
  return { systemId: sid, kind: 'capability', title: `${sid} ok`, detail: 'empty payload' };
}

// ── Spec synthesis ───────────────────────────────────────────────────────────

const PHOENIX_KEY = process.env.PHOENIX_API_KEY ?? '';
const PHOENIX_URL = (process.env.PHOENIX_BASE_URL ?? 'https://api.pgsgrove.com/v1').replace(/\/$/, '');
const PHOENIX_SYNTH_MODEL = process.env.PHOENIX_SYNTH_MODEL ?? 'glm-5.3-flash';

function buildSynthPrompt(directive: ResearchDirective, contributions: Contribution[]): string {
  const lit = contributions.filter(c => c.kind === 'literature' && c.papers?.length);
  const ins = contributions.filter(c => c.kind === 'insight');
  const cap = contributions.filter(c => c.kind === 'capability' || c.kind === 'data');
  const off = contributions.filter(c => c.kind === 'offline');

  let paperBlock = '';
  for (const c of lit) {
    paperBlock += `\n### Papers via ${c.systemId}\n`;
    for (const p of c.papers!) paperBlock += `- [${p.published || 'n.d.'}] ${p.title} (${p.source}) ${p.url}\n`;
  }
  const insightBlock = ins.map(c => `### ${c.title}\n${c.detail}`).join('\n\n');
  const capBlock = cap.map(c => `- ${c.title}: ${c.detail}`).join('\n');
  const offBlock = off.length ? off.map(c => `- ${c.systemId}: ${c.detail}`).join('\n') : 'none — full fleet responded';

  return `You are the synthesis engine of a research-commander orchestrating a fleet of specialized biomedical systems. Produce ONE unified research specification from the directive and the fleet contributions below.

## DIRECTIVE
Objective: ${directive.objective}
Direction: ${directive.direction}
${directive.hypothesis ? `Standing hypothesis: ${directive.hypothesis}` : 'No standing hypothesis — formulate one from the evidence.'}
Research questions:
${directive.questions.map(q => `- ${q}`).join('\n') || '- (none specified — derive from objective)'}
${directive.contextNotes ? `Context/constraints: ${directive.contextNotes}` : ''}

## FLEET CONTRIBUTIONS (real system outputs)
${paperBlock || '### Papers\n- none retrieved this run'}
${insightBlock ? `\n${insightBlock}\n` : ''}
Fleet capability notes:
${capBlock}

Systems offline this run (their roles are unfulfilled — say so in the spec):
${offBlock}

## OUTPUT — return ONLY markdown for the research spec with exactly these sections:
# <Spec title>
## 1. Executive Summary (<=200 words, plain language)
## 2. Background & Evidence Base (cite the retrieved papers by title/year; every claim tied to a paper or marked "unsupported — needs data")
## 3. Hypothesis (single primary hypothesis; falsifiable)
## 4. Research Questions (numbered, each mapped to which fleet system can answer it)
## 5. Method Plan (per contributing system: its role, its input, its expected output; note offline systems and what they would add)
## 6. Expected Outputs & Success Criteria (concrete artifacts)
## 7. Falsification Criteria (what evidence would kill the hypothesis)
## 8. Risks & Gaps (including: claims above that are unsupported; systems offline)
## 9. Next Actions (ordered, actionable)

Rules: use ONLY the papers listed for citations — do not invent references. Distinguish clearly between what the evidence shows and what is hypothesis. Be concrete; no filler.`;
}

async function synthesizeViaPhoenix(prompt: string): Promise<string | null> {
  if (!PHOENIX_KEY) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${PHOENIX_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PHOENIX_KEY}` },
      body: JSON.stringify({
        model: PHOENIX_SYNTH_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4096,
        temperature: 0.2,
        stream: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const text = data.choices?.[0]?.message?.content ?? '';
    return text.length > 200 ? text : null;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function synthesizeDeterministic(directive: ResearchDirective, contributions: Contribution[], title: string): string {
  const lit = contributions.filter(c => c.kind === 'literature' && c.papers?.length);
  const ins = contributions.filter(c => c.kind === 'insight');
  const cap = contributions.filter(c => c.kind === 'capability' || c.kind === 'data');
  const off = contributions.filter(c => c.kind === 'offline');
  const L: string[] = [];
  L.push(`# ${title} — Research Specification`);
  L.push('');
  L.push('> ⚠️ Deterministic assembly (no LLM synthesis available). Contributions are organized, not interpreted.');
  L.push('');
  L.push(`## Directive\n**Objective:** ${directive.objective}\n**Direction:** ${directive.direction}`);
  if (directive.hypothesis) L.push(`**Standing hypothesis:** ${directive.hypothesis}`);
  if (directive.questions.length) L.push(`**Questions:**\n${directive.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`);
  L.push('');
  L.push('## Evidence Base (retrieved papers)');
  for (const c of lit) {
    L.push(`\n### via ${c.systemId}`);
    for (const p of c.papers!) L.push(`- [${p.published || 'n.d.'}] ${p.title} — ${p.url || p.source}`);
  }
  if (!lit.length) L.push('- none retrieved');
  if (ins.length) { L.push('\n## Verified Hypotheses (CureMind)'); for (const c of ins) L.push(`\n### ${c.title}\n${c.detail}`); }
  L.push('\n## Fleet Capability Notes');
  for (const c of cap) L.push(`- ${c.title}: ${c.detail}`);
  if (off.length) { L.push('\n## Offline Systems (roles unfulfilled)'); for (const c of off) L.push(`- ${c.systemId}: ${c.detail}`); }
  L.push('\n## Hypothesis');
  L.push(directive.hypothesis ?? '_To be formulated — requires LLM synthesis (set PHOENIX_API_KEY) or manual review._');
  L.push('\n## Method Plan');
  L.push('Per-system roles as dispatched this run; see capability notes. Offline systems must be started to fulfill their roles.');
  L.push('\n## Falsification Criteria');
  L.push('_Requires synthesis — pending._');
  L.push('\n## Next Actions');
  L.push('1. Bring offline systems online and re-run.');
  L.push('2. Set PHOENIX_API_KEY for full LLM synthesis.');
  L.push('3. Refine directive questions and re-run.');
  return L.join('\n');
}

export async function synthesizeSpec(
  directive: ResearchDirective,
  results: DispatchResult[],
  title: string,
): Promise<ResearchSpec> {
  const contributions = results.map(extractContribution).filter((c): c is Contribution => c !== null);
  const systemsOffline = contributions.filter(c => c.kind === 'offline').map(c => c.systemId);
  const synthesizedAt = new Date().toISOString();

  const prompt = buildSynthPrompt(directive, contributions);
  const phoenixText = await synthesizeViaPhoenix(prompt);
  if (phoenixText) {
    return { directive, contributions, systemsOffline, spec: phoenixText, synthesizedBy: 'phoenix', synthesizedAt };
  }
  return { directive, contributions, systemsOffline, spec: synthesizeDeterministic(directive, contributions, title), synthesizedBy: 'deterministic', synthesizedAt };
}
