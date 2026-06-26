import { test, expect } from '@playwright/test'
import path from 'path'
import { seedGatewayVehicle, deleteGatewayVehicles, getVehicleStatus, getUnresolvedAlerts, closeGatewayDb } from './fixtures/gateway-vehicles-db'
import { deleteVehiclePosition, deleteVehiclePositions, getVehiclePosition, closeRedis } from './fixtures/redis-position'
import { publishTelemetry } from './fixtures/mqtt-publish'

const AUTH_DIR = path.join(__dirname, '.auth')
test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

// The offline-detector cron ticks once a minute (src/services/offline-detector.ts),
// so this spec genuinely waits out a real tick rather than faking time — that's the
// trade-off TESTING_PLAN.md §3.5 already calls out for this suite. Timeout is set
// generously above the worst-case ~60s wait.
test.setTimeout(90_000)

test.describe('gateway offline detection (full chain via Redis + cron)', () => {
  const vehicleIds: string[] = []

  test.afterAll(async () => {
    await deleteVehiclePositions(vehicleIds)
    await deleteGatewayVehicles(vehicleIds)
    await closeRedis()
    await closeGatewayDb()
  })

  test('a vehicle whose Redis position disappears is marked offline within one cron tick, then recovers on the next telemetry message', async ({ page }) => {
    const vehicleId = await seedGatewayVehicle({ fixture: 'vehicle-b', plate: 'E2E-GW-OFFLINE', status: 'available' })
    vehicleIds.push(vehicleId)

    // Establish a live position first so deleting the key is a meaningful transition,
    // not just "never had one".
    await publishTelemetry('vehicle-b', { status: 'available' })
    await expect.poll(() => getVehiclePosition(vehicleId)).not.toBeNull()

    await deleteVehiclePosition(vehicleId)

    await expect.poll(() => getVehicleStatus(vehicleId), { timeout: 75_000, intervals: [2_000] }).toBe('offline')
    const offlineAlerts = await getUnresolvedAlerts(vehicleId, 'vehicle_offline')
    expect(offlineAlerts).toHaveLength(1)
    expect(offlineAlerts[0].severity).toBe('critical')

    // Scoped to this vehicle's own row rather than asserting "Offline" appears
    // anywhere on the page — the cron tick above also offline-flags every other
    // seed vehicle (none of them have a live Redis position either), so an
    // unscoped text match would pass even if this vehicle's row were wrong.
    await page.goto('/fleet/vehicles')
    await page.getByPlaceholder('ค้นหาทะเบียน, รุ่น...').fill('E2E-GW-OFFLINE')
    await expect(page.locator('tr', { hasText: 'E2E-GW-OFFLINE' }).getByText('Offline', { exact: true })).toBeVisible()

    // Telemetry flowing again proves the vehicle is reachable — status flips back
    // and the offline alert auto-resolves (alert-service.ts resolveOfflineAlert).
    await publishTelemetry('vehicle-b', { status: 'available' })
    await expect.poll(() => getVehicleStatus(vehicleId), { timeout: 15_000 }).toBe('available')
    await expect.poll(async () => {
      const alerts = await getUnresolvedAlerts(vehicleId, 'vehicle_offline')
      return alerts.length
    }).toBe(0)
  })
})
