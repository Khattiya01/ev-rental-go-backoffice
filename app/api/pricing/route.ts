import { NextResponse } from 'next/server'
import { db } from '@/db'
import { vehicles, pricingPlans } from '@/db/schema'
import { getCurrentUser } from '@/lib/dal'
import { requirePermission } from '@/lib/permissions'

export async function GET(): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'settings', 'canRead')
  if (denied) return denied

  // Distinct vehicle models actually in the fleet
  const vehicleModels = await db
    .selectDistinct({ make: vehicles.make, model: vehicles.model })
    .from(vehicles)
    .orderBy(vehicles.make, vehicles.model)

  const plans = await db.select().from(pricingPlans)

  // Merge: one card per distinct make+model, filled with pricing if exists
  const result = vehicleModels.map(vm => {
    const key = `${vm.make} ${vm.model}`
    const plan = plans.find(p => p.vehicleModel === key)
    return {
      id:           plan?.id ?? null,
      vehicleModel: key,
      dailyRate:    plan?.dailyRate    ?? 0,
      monthlyRate:  plan?.monthlyRate  ?? 0,
      deposit:      plan?.deposit      ?? 0,
      enabled:      plan?.enabled      ?? false,
    }
  })

  return NextResponse.json({ plans: result })
}

export async function PUT(request: Request): Promise<NextResponse> {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const denied = await requirePermission(currentUser, 'settings', 'canWrite')
  if (denied) return denied

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  if (!Array.isArray(raw.plans) || raw.plans.length === 0) {
    return NextResponse.json({ error: 'plans array required' }, { status: 400 })
  }

  const inputPlans = raw.plans as Record<string, unknown>[]
  for (const p of inputPlans) {
    if (typeof p.vehicleModel !== 'string' || !p.vehicleModel.trim()) {
      return NextResponse.json({ error: 'Each plan must have vehicleModel' }, { status: 400 })
    }
    if (typeof p.dailyRate !== 'number' || typeof p.monthlyRate !== 'number' || typeof p.deposit !== 'number') {
      return NextResponse.json({ error: 'dailyRate, monthlyRate, deposit must be numbers' }, { status: 400 })
    }
    if (p.dailyRate < 0 || p.monthlyRate < 0 || p.deposit < 0) {
      return NextResponse.json({ error: 'Rates cannot be negative' }, { status: 400 })
    }
  }

  // Upsert by vehicleModel — preserves plans for models no longer in payload
  for (const p of inputPlans) {
    const values = {
      vehicleModel: (p.vehicleModel as string).trim(),
      dailyRate:    p.dailyRate    as number,
      monthlyRate:  p.monthlyRate  as number,
      deposit:      p.deposit      as number,
      enabled:      typeof p.enabled === 'boolean' ? p.enabled : false,
      updatedAt:    new Date(),
    }
    await db
      .insert(pricingPlans)
      .values(values)
      .onConflictDoUpdate({
        target: pricingPlans.vehicleModel,
        set: { dailyRate: values.dailyRate, monthlyRate: values.monthlyRate, deposit: values.deposit, enabled: values.enabled, updatedAt: values.updatedAt },
      })
  }

  return NextResponse.json({ ok: true })
}
