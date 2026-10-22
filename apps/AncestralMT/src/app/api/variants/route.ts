import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const gene = searchParams.get('gene')
    const classification = searchParams.get('classification')
    const minBias = searchParams.get('minBias')
    const datasetId = searchParams.get('datasetId')

    const where: Record<string, unknown> = {}

    if (gene) {
      where.gene = gene
    }

    if (classification) {
      where.classification = classification
    }

    if (minBias) {
      const biasValue = parseFloat(minBias)
      if (!isNaN(biasValue)) {
        where.ancestryBiasScore = { gte: biasValue }
      }
    }

    if (datasetId) {
      where.datasetId = datasetId
    }

    const variants = await db.variantFinding.findMany({
      where,
      include: {
        dataset: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: variants })
  } catch (error) {
    console.error('Error fetching variants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch variants' },
      { status: 500 }
    )
  }
}
