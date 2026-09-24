import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    // drizzle.config.test.ts is a Drizzle config for the test DB, not a Vitest spec —
    // the filename collides with the include glob above.
    exclude: ['node_modules', '.next', '.next-test', 'e2e/**', 'drizzle.config.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './vitest.stubs/server-only.ts'),
    },
  },
})
