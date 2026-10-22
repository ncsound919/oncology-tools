import { NextResponse } from "next/server";
import { EXPERIMENTS } from "@/lib/data";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let rows = await db.experiment.count();
    if (rows === 0) {
      await db.experiment.createMany({
        data: EXPERIMENTS.map((e) => ({
          number: e.number,
          title: e.title,
          objective: e.objective,
          hypothesis: e.hypothesis,
          method: e.method.join("\n\n"),
          endpoints: e.endpoints,
          controls: e.controls,
          interpretation: `Positive: ${e.positive}\n\nNegative: ${e.negative}`,
          legs: e.legs,
        })),
      });
    }
    const experiments = await db.experiment.findMany({ orderBy: { number: "asc" } });
    return NextResponse.json({ experiments });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, experiments: EXPERIMENTS }, { status: 200 });
  }
}
