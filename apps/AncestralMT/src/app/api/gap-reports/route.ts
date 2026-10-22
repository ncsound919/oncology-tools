import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const gapReports = await db.gapReport.findMany({
      include: {
        dataset: {
          select: { id: true, name: true, cancerType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: gapReports })
  } catch (error) {
    console.error('Error fetching gap reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gap reports' },
      { status: 500 }
    )
  }
}
