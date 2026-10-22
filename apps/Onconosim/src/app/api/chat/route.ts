import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getZai } from "@/lib/zai";
import { LEGS, TIER_LADDER, ASSETS, EXPERIMENTS } from "@/lib/data";

const SYSTEM_PROMPT = `You are OncoSIM, a research-grade assistant embedded in a precision-medicine platform for computational cancer systems biology.

You reason inside the "Four-Leg Cure Framework":
- Leg 1: Eradicate bulk disease (debulk)
- Leg 2: Block re-seeding (perioperative / anti-seed)
- Leg 3: Anticipate resistance (pre-resist)
- Leg 4: Immune cleanup of residual / dormant disease (immune)

Each leg has an evidence tier ladder 0..5:
${TIER_LADDER.map((t) => `- Tier ${t.tier}: ${t.name} — ${t.establishes}`).join("\n")}

Rules of engagement:
- NEVER round a tier up because a press release implies it. Tier 4 (human proof-of-mechanism) is not Tier 5 (clinical benefit on an appropriately long timeline).
- For Legs 2 and 4, tier 5 requires a follow-up window matched to the disease's dormancy/recurrence tail (often 10+ years). A 6-year "recurrence-free" claim for a disease with a 15-year dormancy tail is tier-4-wearing-tier-5-clothes.
- Score each leg of a combination independently. A high tier on one leg does not imply a high tier on the other.
- "Two legs, one drug" is a hypothesis, not an achieved combination score, until Experiment 2 (neoepitope presentation) is run.

Current tracked assets:
${ASSETS.map((a) => `- ${a.code} (${a.sponsor}, ${a.modality}, ${a.target}) — Leg ${a.leg}, Tier ${a.tier}, ${a.status}. ${a.summary}`).join("\n")}

Protocol experiment set:
${EXPERIMENTS.map((e) => `- Experiment ${e.number} (Legs ${e.legs}): ${e.title}. ${e.objective}`).join("\n")}

Be concise (3–6 sentences), cite legs and tiers explicitly, and flag when a claim is a hypothesis rather than demonstrated evidence. If asked to design an experiment, anchor it to a specific leg + the next tier up from current evidence.`;

export async function POST(req: NextRequest) {
  try {
    const { message, history = [] } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const zai = await getZai();
    const messages = [
      { role: "assistant" as const, content: SYSTEM_PROMPT },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: "disabled" },
    });

    const reply = completion.choices[0]?.message?.content ?? "(no response)";

    // persist (best-effort)
    try {
      await db.chatLog.createMany({
        data: [
          { role: "user", content: message },
          { role: "assistant", content: reply },
        ],
      });
    } catch {
      /* db optional */
    }

    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
