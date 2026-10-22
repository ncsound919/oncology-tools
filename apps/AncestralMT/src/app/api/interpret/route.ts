import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { db } from '@/lib/db';

const SYSTEM_PROMPT = `You are AncestralMT AI, a specialist in ancestry-aware cancer variant interpretation. You analyze genetic variants with specific attention to how ancestral diversity gaps in reference databases affect pathogenicity classification reliability.

Your analysis framework:
1. **Variant Identity**: Gene, genomic position, variant type (SNV/indel/CNV), protein effect
2. **Clinical Classification**: Current ACMG classification and confidence level
3. **Population Frequency Context**: How frequency differs across ancestral populations (European, African, Hispanic/Latino, East Asian, South Asian, AI/AN)
4. **Ancestry Bias Assessment**: How reference panel composition affects classification confidence. Flag if >60% bias.
5. **Clinical Actionability**: FDA-approved therapies, clinical trial eligibility, guideline recommendations
6. **Underrepresentation Risk**: Whether the variant is poorly characterized in non-European populations
7. **Recommendation**: Specific actions to improve interpretation confidence

CRITICAL CONTEXT:
- 86% of GWAS data is from European descent populations
- TCGA prostate cancer: 94% White, TCGA colon: 75% White
- PRS models lose 40-70% accuracy in non-European populations
- VUS rate is 2-3x higher for variants found only in underrepresented populations
- 38% of FDA-approved cancer drugs show ancestry-dependent efficacy

Always highlight when interpretation confidence is limited by ancestral diversity gaps. Be specific about which populations are affected and what data would be needed to improve confidence.

Respond in Markdown format with clear sections. Be scientifically rigorous but accessible.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { variant, gene, context } = body;

    if (!variant && !gene) {
      return NextResponse.json(
        { error: 'Variant ID or gene name is required' },
        { status: 400 }
      );
    }

    // Build context from database if available
    let dbContext = '';
    if (gene) {
      const variants = await db.variantFinding.findMany({
        where: { gene },
        include: { dataset: { select: { name: true, cancerType: true } } },
        take: 10,
      });

      if (variants.length > 0) {
        dbContext = `\n\nKnown variants in ${gene} from AncestralMT database:\n`;
        for (const v of variants) {
          dbContext += `\n- ${v.variant}: ${v.classification}, Dataset Freq: ${v.populationFrequency}, Reference Freq: ${v.referenceFrequency}, Ancestry Bias Score: ${(v.ancestryBiasScore * 100).toFixed(0)}%, Dataset: ${v.dataset?.name}, Notes: ${v.notes}`;
        }
        dbContext += '\n\nUse this database context to enhance your interpretation.';
      }
    }

    const userMessage = context
      ? `Please analyze this variant with the following context:\n\n**Variant**: ${variant || 'N/A'}\n**Gene**: ${gene || 'N/A'}\n**Additional Context**: ${context}${dbContext}`
      : `Please analyze this variant:\n\n**Variant**: ${variant || 'N/A'}\n**Gene**: ${gene || 'N/A'}${dbContext}`;

    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    });

    const response = completion.choices[0]?.message?.content || 'No interpretation available.';

    return NextResponse.json({ success: true, interpretation: response });
  } catch (error) {
    console.error('Interpretation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate interpretation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
