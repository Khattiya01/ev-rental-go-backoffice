import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Standard Playwright "auth setup project" pattern: this file is matched by the
// `setup` project, which every other project declares as a `dependencies` entry —
// so by the time it runs, `webServer` is guaranteed to already be up.
const AUTH_DIR = path.join(__dirname, '.auth')

const SEEDED_USERS = {
  super_admin: { email: 'admin@evrentalgo.com', password: 'admin1234' },
  admin: { email: 'fleet@evrentalgo.com', password: 'admin1234' },
  viewer: { email: 'viewer@evrentalgo.com', password: 'admin1234' },
} as const

fs.mkdirSync(AUTH_DIR, { recursive: true })

for (const [role, credentials] of Object.entries(SEEDED_USERS)) {
  setup(`authenticate as ${role}`, async ({ request }) => {
    const response = await request.post('/api/auth/login', { data: credentials })
    expect(response.ok(), `login failed for seeded ${role} account`).toBeTruthy()

    await request.storageState({ path: path.join(AUTH_DIR, `${role}.json`) })
  })
}
