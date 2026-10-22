import { NextRequest, NextResponse } from "next/server";
import { getZai } from "@/lib/zai";
import { LEGS } from "@/lib/data";

// POST /api/scoring — score a proposed combination across legs (LLM-assisted)
export async function POST(req: NextRequest) {
  try {
    const { combination } = await req.json();
    if (!combination || typeof combination !== "string") {
      return NextResponse.json({ error: "combination description required" }, { status: 400 });
    }

    const zai = await getZai();
    const sys = `You score cancer therapeutic combinations inside the Four-Leg Cure Framework.
Legs: ${LEGS.map((l) => `Leg ${l.id} — ${l.name}`).join("; ")}.
For each leg the combination touches, return a tier 0..5 with a one-sentence justification. Be strict — do not round up.
Respond ONLY as compact JSON: {"legs":[{"leg":1,"tier":N,"note":"..."}],"verdict":"...","highest_unmet_tier_gap":"leg N tier M to M+1: ..."}`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: sys },
        { role: "user", content: `Combination to score: ${combination}` },
      ],
      thinking: { type: "disabled" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown = { raw };
    try {
      const clean = raw.replace(/```json\s*|\s*```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { raw };
    }
    return NextResponse.json({ score: parsed });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
