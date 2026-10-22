import { NextResponse } from "next/server";
import { VARIANTS, HLA_ALLELES } from "@/lib/data";
import { db } from "@/lib/db";

export async function GET() {
  try {
    let rows = await db.variant.count();
    if (rows === 0) {
      await db.variant.createMany({
        data: VARIANTS.map((v) => ({
          gene: v.gene,
          hgvs: v.hgvs,
          protein: v.protein,
          alleleFreq: v.alleleFreq,
          cohort: v.cohort,
          hlaBinding: v.hlaBinding,
        })),
      });
    }
    const variants = await db.variant.findMany({ orderBy: [{ gene: "asc" }, { alleleFreq: "desc" }] });
    return NextResponse.json({ variants, hlaAlleles: HLA_ALLELES });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, variants: VARIANTS, hlaAlleles: HLA_ALLELES }, { status: 200 });
  }
}
