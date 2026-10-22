import { NextResponse } from "next/server";
import { ASSETS } from "@/lib/data";
import { db } from "@/lib/db";

// GET /api/assets — return all tracked assets (seeded from the static data file
// into the database on first request, then served from SQLite on subsequent calls).
export async function GET() {
  try {
    let rows = await db.asset.count();
    if (rows === 0) {
      await db.asset.createMany({
        data: ASSETS.map((a) => ({
          code: a.code,
          name: a.name,
          sponsor: a.sponsor,
          modality: a.modality,
          target: a.target,
          leg: a.leg,
          tier: a.tier,
          status: a.status,
          summary: a.summary,
        })),
      });
    }
    const assets = await db.asset.findMany({ orderBy: [{ leg: "asc" }, { tier: "desc" }] });
    return NextResponse.json({ assets });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, assets: ASSETS }, { status: 200 });
  }
}
