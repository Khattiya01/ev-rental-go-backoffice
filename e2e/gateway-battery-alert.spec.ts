import { test, expect } from '@playwright/test'
import path from 'path'
import { seedGatewayVehicle, deleteGatewayVehicles, getUnresolvedAlerts, closeGatewayDb } from './fixtures/gateway-vehicles-db'
import { deleteVehiclePositions, closeRedis } from './fixtures/redis-position'
import { publishTelemetry } from './fixtures/mqtt-publish'

// Full-chain @gateway suite (TESTING_PLAN.md §3.5 group B) — drives real MQTT
// messages through the actual gateway process into the same Postgres/Redis the
// backoffice test server reads from. Severity-threshold edge cases are already
// covered by the gateway's own unit tests (alert-service.test.ts); this only
// needs to prove the wire is actually connected end to end.
const AUTH_DIR = path.join(__dirname, '.auth')
test.use({ storageState: path.join(AUTH_DIR, 'super_admin.json') })

test.describe('gateway battery alert (full chain via MQTT)', () => {
  const vehicleIds: string[] = []

  test.afterAll(async () => {
    await deleteVehiclePositions(vehicleIds)
    await deleteGatewayVehicles(vehicleIds)
    await closeRedis()
    await closeGatewayDb()
  })

  test('publishing soc:12 over MQTT creates a critical battery_low alert visible on /alerts', async ({ page }) => {
    const vehicleId = await seedGatewayVehicle({ fixture: 'vehicle-a', plate: 'E2E-GW-BATT' })
    vehicleIds.push(vehicleId)

    await publishTelemetry('vehicle-a', { soc: 12 })

    await expect.poll(async () => {
      const alerts = await getUnresolvedAlerts(vehicleId, 'battery_low')
      return alerts.length
    }, { timeout: 15_000 }).toBe(1)

    const [alert] = await getUnresolvedAlerts(vehicleId, 'battery_low')
    expect(alert.severity).toBe('critical')

    await page.goto('/alerts')
    await page.getByPlaceholder('ค้นหาข้อความแจ้งเตือน...').fill('Battery low (12%)')
    await expect(page.getByText('Battery low (12%)')).toBeVisible()
  })
})
