import { defineConfig, devices } from '@playwright/test'
import path from 'path'

// Separate config for the @gateway suite (TESTING_PLAN.md §3.5 group B) — full-chain
// specs that publish real MQTT messages and need the actual IoT gateway process
// running, not just postgres/redis/mosquitto. Kept out of playwright.config.ts so
// the default `pnpm test:e2e` (every PR) never pays for booting a second service
// and isn't exposed to this suite's extra flakiness surface (real broker timing,
// cron-tick waits). Run explicitly via `pnpm test:e2e:gateway`, as its own CI job.

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`
const GATEWAY_PORT = 3101
const GATEWAY_DIR = path.join(__dirname, '../ev-rental-iot-gateway')

export default defineConfig({
  testDir: './e2e',
  testMatch: /gateway-.*\.spec\.ts/,
  // Only 2 vehicle identities have provisioned MQTT credentials (mosquitto/passwd),
  // shared across all gateway-*.spec.ts files — parallel workers would race to
  // insert/delete the same vehicle row ids. Force one test at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      command: 'pnpm dev:test',
      url: BASE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev:test',
      cwd: GATEWAY_DIR,
      url: `http://localhost:${GATEWAY_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
