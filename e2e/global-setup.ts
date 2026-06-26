import { execSync } from 'child_process'

/**
 * Runs once before any project/worker starts. Resets the dedicated E2E database
 * (`ev_rental_go_test`) back to the known seed fixture so specs never depend on
 * leftover state from a previous run. Talks to Postgres directly — does not need
 * the app server to be up yet.
 */
export default function globalSetup(): void {
  execSync('pnpm db:seed:test', { stdio: 'inherit', cwd: __dirname + '/..' })
}
