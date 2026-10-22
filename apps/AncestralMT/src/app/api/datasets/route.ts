import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const datasets = await db.dataset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ancestryBreakdown: true,
        variantFindings: true,
      },
    })

    return NextResponse.json({ data: datasets })
  } catch (error) {
    console.error('Error fetching datasets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, source, cancerType, totalSamples, ancestryBreakdown } = body

    if (!name || !source || typeof totalSamples !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: name, source, totalSamples' },
        { status: 400 }
      )
    }

    if (ancestryBreakdown && !Array.isArray(ancestryBreakdown)) {
      return NextResponse.json(
        { error: 'ancestryBreakdown must be an array' },
        { status: 400 }
      )
    }

    const dataset = await db.dataset.create({
      data: {
        name,
        description: description ?? null,
        source,
        cancerType: cancerType ?? null,
        totalSamples,
        ancestryBreakdown: ancestryBreakdown
          ? {
              create: ancestryBreakdown.map(
                (item: { population: string; count: number; percentage: number }) => ({
                  population: item.population,
                  count: item.count,
                  percentage: item.percentage,
                })
              ),
            }
          : undefined,
      },
      include: {
        ancestryBreakdown: true,
        variantFindings: true,
      },
    })

    return NextResponse.json({ data: dataset }, { status: 201 })
  } catch (error) {
    console.error('Error creating dataset:', error)
    return NextResponse.json(
      { error: 'Failed to create dataset' },
      { status: 500 }
    )
  }
}
