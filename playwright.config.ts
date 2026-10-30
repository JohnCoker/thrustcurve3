import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright config for ThrustCurve E2E tests.
 * Start the server with `bin/www-test` before running: npm run test:e2e
 */
export default defineConfig({
  // On a Mac, use the user browser cache so Cursor's sandbox can find Chromium.
  // Linux CI installs browsers into Playwright's default cache.
  env:
    process.platform === 'darwin' && !process.env.CI && process.env.HOME
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
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
