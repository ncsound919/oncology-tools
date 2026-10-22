import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/simulations — persist a simulation run
export async function POST(req: NextRequest) {
  try {
    const { kind, params, results, assetCode } = await req.json();
    if (!kind || !params || !results) {
      return NextResponse.json({ error: "kind, params, results required" }, { status: 400 });
    }
    let assetId: string | undefined;
    if (assetCode) {
      const asset = await db.asset.findUnique({ where: { code: assetCode } });
      assetId = asset?.id;
    }
    const sim = await db.simulation.create({
      data: {
        kind,
        params: JSON.stringify(params),
        results: JSON.stringify(results),
        assetId,
      },
    });
    return NextResponse.json({ simulation: sim });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// GET /api/simulations — list recent runs
export async function GET() {
  try {
    const sims = await db.simulation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { asset: true },
    });
    return NextResponse.json({ simulations: sims });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, simulations: [] }, { status: 200 });
  }
}
