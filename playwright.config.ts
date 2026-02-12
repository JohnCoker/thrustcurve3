import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config for ThrustCurve E2E tests.
 * Start the server with `bin/www-test` before running: npm run test:e2e
 */
export default defineConfig({
  // Use user's browser cache (avoids sandbox cache when run from Cursor)
  env: process.env.HOME
    ? { PLAYWRIGHT_BROWSERS_PATH: path.join(process.env.HOME, 'Library/Caches/ms-playwright') }
    : undefined,
  testDir: './spec/web',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
