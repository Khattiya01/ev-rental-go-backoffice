import { test, expect } from '@playwright/test'
import { seedGatewayVehicle, deleteGatewayVehicles, getVehicleStatus, getUnresolvedAlerts, closeGatewayDb } from './fixtures/gateway-vehicles-db'
import { getVehiclePosition, deleteVehiclePositions, closeRedis } from './fixtures/redis-position'
import { publishTelemetry } from './fixtures/mqtt-publish'

// mosquitto/acl.conf's `pattern write vehicle/%u/data` only lets a connected MQTT
// user publish to its *own* vehicle topic. This proves that holds at the broker
// level — vehicle-a's credential publishing into vehicle-b's topic must never
// reach the gateway's subscriber, so none of vehicle-b's side effects (Redis
// position, status sync, alerts) should occur.
test.describe('gateway MQTT ACL enforcement', () => {
  const vehicleIds: string[] = []

  test.afterAll(async () => {
    await deleteVehiclePositions(vehicleIds)
    await deleteGatewayVehicles(vehicleIds)
    await closeRedis()
    await closeGatewayDb()
  })

  test('vehicle A publishing into vehicle B\'s topic is rejected by the broker and never reaches the gateway', async () => {
    const vehicleAId = await seedGatewayVehicle({ fixture: 'vehicle-a', plate: 'E2E-GW-ACL-A', status: 'available' })
    const vehicleBId = await seedGatewayVehicle({ fixture: 'vehicle-b', plate: 'E2E-GW-ACL-B', status: 'available' })
    vehicleIds.push(vehicleAId, vehicleBId)

    // Cross-publish: authenticated as vehicle-a, but onto vehicle-b's topic. Payload
    // values are deliberately different from vehicle-b's seeded state (soc:10 would
    // trigger a critical battery_low alert, status:'charging' would change its status)
    // so an accepted message would be unmistakable.
    await publishTelemetry('vehicle-a', { soc: 10, status: 'charging' }, 'vehicle-b')

    // Give the broker/gateway a beat to (incorrectly) process it before asserting
    // the negative — same margin used for a normal valid message round-trip.
    await new Promise(resolve => setTimeout(resolve, 3_000))

    expect(await getVehiclePosition(vehicleBId)).toBeNull()
    expect(await getVehicleStatus(vehicleBId)).toBe('available')
    expect(await getUnresolvedAlerts(vehicleBId, 'battery_low')).toHaveLength(0)

    // Sanity control: vehicle-a publishing to its *own* topic still works, proving
    // the absence of effects above is the ACL doing its job, not a broken broker/gateway.
    await publishTelemetry('vehicle-a', { soc: 10 })
    await expect.poll(() => getVehiclePosition(vehicleAId), { timeout: 15_000 }).not.toBeNull()
    await expect.poll(async () => {
      const alerts = await getUnresolvedAlerts(vehicleAId, 'battery_low')
      return alerts.length
    }).toBe(1)
  })
})
