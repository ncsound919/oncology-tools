import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const [
      datasetCount,
      variantCount,
      sampleResult,
      diversityResult,
      biasResult,
      submissions,
      datasets,
    ] = await Promise.all([
      db.dataset.count(),
      db.variantFinding.count(),
      db.dataset.aggregate({ _sum: { totalSamples: true } }),
      db.gapReport.aggregate({ _avg: { overallDiversityScore: true } }),
      db.variantFinding.aggregate({ _avg: { ancestryBiasScore: true } }),
      db.biobankSubmission.findMany({ select: { status: true } }),
      db.dataset.findMany({ select: { cancerType: true } }),
    ])

    // Biobank submission counts by status
    const statusCounts: Record<string, number> = {}
    for (const sub of submissions) {
      statusCounts[sub.status] = (statusCounts[sub.status] ?? 0) + 1
    }
    const biobankSubmissionsByStatus = Object.entries(statusCounts).map(
      ([status, _count]) => ({ status, _count })
    )

    // Cancer type distribution
    const cancerCounts: Record<string, number> = {}
    for (const ds of datasets) {
      const type = ds.cancerType ?? 'Unknown'
      cancerCounts[type] = (cancerCounts[type] ?? 0) + 1
    }
    const cancerTypeDistribution = Object.entries(cancerCounts).map(
      ([cancerType, count]) => ({ cancerType, _sum: { totalSamples: count } })
    )

    return NextResponse.json({
      data: {
        totalDatasets: datasetCount,
        totalSamples: sampleResult._sum.totalSamples ?? 0,
        averageDiversityScore:
          diversityResult._avg.overallDiversityScore ?? 0,
        totalVariantFindings: variantCount,
        averageBiasScore: biasResult._avg.ancestryBiasScore ?? 0,
        biobankSubmissionsByStatus,
        cancerTypeDistribution,
      },
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
