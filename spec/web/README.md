# Web Tests

This directory contains basic sanity tests that the web application is working (running locally).
Start the server using the `bin/www-test` script (to run with a known database).

## Playwright Tests

The primary E2E tests are in `thrustcurve.spec.ts`, translated from the original Selenium IDE
project (`ThrustCurve.side`).

**First-time setup:** Install browsers (one-time):
```bash
npx playwright install chromium webkit
```

**Run the tests:**
```bash
# Terminal 1: Start the server with test database
./bin/www-test

# Terminal 2: Run Playwright tests (from project root)
npm run test:e2e
```

For interactive debugging: `npm run test:e2e:ui`

**Note:** Run tests from a normal terminal (not inside Cursor's sandbox) so Chromium finds the
installed browsers in `~/Library/Caches/ms-playwright`.

**Test suites:**
- **index** – Homepage navigation, quick search from navbar
- **search** – Attribute search form, filters (manufacturer, type, impulse class, flame/smoke color)
- **guide** – Motor guide with rocket dimensions, saved rocket matching (requires test user)
- **browser** – Motor browser navigation by category, class, propellant, burn time

**Note:** The guide test with saved rocket requires a test user `flier.fred@gmail.com` / `secret` in the
test database. The Selenium IDE project assumed this user and "Alpha III" rocket exist.

## Selenium IDE

The `.side` files are [Selenium IDE](https://www.selenium.dev/selenium-ide/) projects and can be
executed from it (as a plug-in to Chrome or Firefox).
