import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Handlers in src/test/mocks/handlers.ts are written as relative paths
    // ('/api/workouts'). MSW resolves those against the document origin, and
    // api-client calls an absolute http://localhost:8080/api — so under the
    // default jsdom origin (:3000) no handler ever matched and every API test
    // failed with "[MSW] Cannot bypass a request". Pinning the document origin
    // to the API origin keeps the handlers readable and makes them match.
    environmentOptions: {
      jsdom: { url: 'http://localhost:8080' },
    },
    // src/e2e holds Playwright specs, which Vitest cannot run: they call
    // test.describe() from @playwright/test and abort the whole file.
    exclude: ['src/e2e/**', 'node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
