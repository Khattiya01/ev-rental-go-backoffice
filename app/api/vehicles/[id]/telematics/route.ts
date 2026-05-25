import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { db } from '@/db'
import { vehicles, telemetryHistory } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Verify vehicle exists
  const vehicleRows = await db
    .select({ id: vehicles.id, socPercent: vehicles.socPercent })
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1)
    .catch(() => null)

  if (!vehicleRows || vehicleRows.length === 0) {
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
  }

  const vehicle = vehicleRows[0]

  // Query latest telemetry record from TimescaleDB
  const telemetryRows = await db
    .select()
    .from(telemetryHistory)
    .where(eq(telemetryHistory.vehicleId, id))
    .orderBy(desc(telemetryHistory.recordedAt))
    .limit(1)
    .catch(() => [])

  const latest = telemetryRows[0] ?? null

  return NextResponse.json({
    vehicleId: id,
    // Fall back to vehicle.socPercent if no telemetry record exists yet
    socPercent: latest?.socPercent ?? vehicle.socPercent,
    temperature: latest?.temperature ?? null,
    chargeCycles: latest?.chargeCycles ?? null,
    deepDischargeCount: latest?.deepDischargeCount ?? null,
    recordedAt: latest?.recordedAt ?? null,
  })
}
