import { defineConfig, devices } from '@playwright/test'

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  // The @gateway suite (gateway-*.spec.ts) needs the IoT gateway process + its own
  // webServer entry — run separately via `pnpm test:e2e:gateway` / playwright.gateway.config.ts.
  testIgnore: /gateway-.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',

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

  // Boots the custom server.ts (Next.js + WS) against .env.test (isolated DB/Redis,
  // port 3100 so it can run alongside a real dev server on 3000).
  webServer: {
    command: 'pnpm dev:test',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
