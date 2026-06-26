import mqtt from 'mqtt'
import { GATEWAY_FIXTURE_VEHICLE_IDS, type GatewayFixtureVehicle } from './gateway-vehicles-db'

// Matches mosquitto/passwd — these two ids double as both the vehicle's MQTT
// username and the `vehicles.id` row the gateway's vehicle-validator checks
// against (see gateway-vehicles-db.ts). The ACL's `pattern write vehicle/%u/data`
// rule means each can only publish to its own topic.
const FIXTURE_PASSWORDS: Record<GatewayFixtureVehicle, string> = {
  'vehicle-a': 'e2e-gateway-test-password-1',
  'vehicle-b': 'e2e-gateway-test-password-2',
}

export interface TelemetryOverrides {
  lat?: number
  lng?: number
  speed?: number
  heading?: number
  soc?: number
  temperature?: number
  odometer?: number
  charge_cycles?: number
  status?: 'available' | 'rented' | 'charging' | 'under_repair'
  timestamp?: string
}

function buildPayload(vehicleId: string, overrides: TelemetryOverrides): Record<string, unknown> {
  return {
    vehicle_id: vehicleId,
    lat: 13.7563,
    lng: 100.5018,
    speed: 0,
    heading: 0,
    soc: 80,
    temperature: 30,
    odometer: 1000,
    charge_cycles: 10,
    status: 'available',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

// Connects as `as`, publishes one telemetry message to `topicVehicle`'s topic
// (defaults to its own — pass a different fixture to drive the ACL-violation
// test), and disconnects. One-shot connections are simpler and plenty fast
// for the handful of messages these specs send.
export async function publishTelemetry(
  as: GatewayFixtureVehicle,
  overrides: TelemetryOverrides = {},
  topicVehicle: GatewayFixtureVehicle = as,
): Promise<void> {
  const username = GATEWAY_FIXTURE_VEHICLE_IDS[as]
  const password = FIXTURE_PASSWORDS[as]
  const topicVehicleId = GATEWAY_FIXTURE_VEHICLE_IDS[topicVehicle]
  const payload = buildPayload(GATEWAY_FIXTURE_VEHICLE_IDS[as], overrides)

  const client = await mqtt.connectAsync('mqtt://localhost:1883', { username, password })
  try {
    await client.publishAsync(`vehicle/${topicVehicleId}/data`, JSON.stringify(payload))
  } finally {
    await client.endAsync()
  }
}
