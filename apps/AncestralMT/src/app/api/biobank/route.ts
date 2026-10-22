import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const submissions = await db.biobankSubmission.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: submissions })
  } catch (error) {
    console.error('Error fetching biobank submissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch biobank submissions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      institutionName,
      location,
      sampleCount,
      cancerTypes,
      ancestries,
      contactEmail,
      notes,
    } = body

    if (!institutionName || !location || typeof sampleCount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: institutionName, location, sampleCount' },
        { status: 400 }
      )
    }

    const submission = await db.biobankSubmission.create({
      data: {
        institutionName,
        location,
        sampleCount,
        cancerTypes: cancerTypes ? JSON.stringify(cancerTypes) : '[]',
        ancestries: ancestries ? JSON.stringify(ancestries) : '[]',
        contactEmail: contactEmail ?? null,
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ data: submission }, { status: 201 })
  } catch (error) {
    console.error('Error creating biobank submission:', error)
    return NextResponse.json(
      { error: 'Failed to create biobank submission' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    const validStatuses = ['submitted', 'reviewed', 'approved', 'integrated']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const existing = await db.biobankSubmission.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Biobank submission not found' },
        { status: 404 }
      )
    }

    const updated = await db.biobankSubmission.update({
      where: { id },
      data: { status },
    })

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('Error updating biobank submission:', error)
    return NextResponse.json(
      { error: 'Failed to update biobank submission' },
      { status: 500 }
    )
  }
}
