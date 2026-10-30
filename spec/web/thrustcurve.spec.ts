import { test, expect, Page } from '@playwright/test';

/**
 * E2E tests for ThrustCurve, translated from Selenium IDE (ThrustCurve.side).
 * Start the server with `bin/www-test` before running: npm run test:e2e
 */

async function login(page: Page, email: string) {
  await page.goto('/mystuff/login.html');
  const loginForm = page.locator('form[name="login"]');
  await loginForm.locator('input[name="username"]').fill(email);
  await loginForm.locator('input[name="password"]').fill('secret');
  await loginForm.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
  await expect(page.getByRole('button', { name: /My Stuff/ })).toBeVisible();
}

/*
 * Tests that modify data run concurrently in each browser project,
 * so each project needs its own records to avoid colliding.
 */
function perProject<T>(byProject: Record<string, T>): T {
  const value = byProject[test.info().project.name];
  if (value === undefined)
    throw new Error(`no test data for project ${test.info().project.name}`);
  return value;
}

test.describe('index', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
  });

  test('homepage navigation and quick search', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Rocket Motor Data • ThrustCurve/);
    await expect(page.locator('a.navbar-brand')).toBeVisible();

    await page.getByRole('link', { name: 'thrustcurve.org' }).click();
    await expect(page).toHaveTitle(/Rocket Motor Data • ThrustCurve/);

    await expect(page.getByRole('link', { name: 'Search Motors' })).toBeVisible();
    await page.getByRole('link', { name: 'Search Motors' }).click();
    await expect(page).toHaveTitle(/Attribute Search • ThrustCurve/);

    await expect(page.getByRole('link', { name: 'Match a Rocket' })).toBeVisible();
    await page.getByRole('link', { name: 'Match a Rocket' }).first().click();
    await expect(page).toHaveTitle(/Motor Guide • ThrustCurve/);

    await expect(page.getByRole('link', { name: 'Browse by Type' })).toBeVisible();
    await page.getByRole('link', { name: 'Browse by Type' }).first().click();
    await expect(page).toHaveTitle(/Motor Browser • ThrustCurve/);

    await page.locator('input[name="text"]').fill('G80');
    await page.locator('input[name="text"]').press('Enter');

    await expect(page).toHaveTitle(/Search Results • ThrustCurve/);
    await expect(page.getByRole('link', { name: 'G80T' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'G80' }).first()).toBeVisible();

    await page.getByRole('link', { name: 'thrustcurve.org' }).click();
    await expect(page).toHaveTitle(/Rocket Motor Data • ThrustCurve/);
  });
});

test.describe('search', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
  });

  test('search form and Estes manufacturer filter', async ({ page }) => {
    await page.goto('/motors/search.html');
    await expect(page).toHaveTitle(/Attribute Search • ThrustCurve/);

    const searchForm = page.locator('form[name="edit"]');
    await expect(searchForm.locator('select[name="manufacturer"]')).toBeVisible();
    await expect(searchForm.locator('input[name="designation"]')).toBeVisible();
    await expect(searchForm.locator('input[name="commonName"]')).toBeVisible();
    await expect(searchForm.locator('select[name="type"]')).toBeVisible();
    await expect(searchForm.locator('select[name="impulseClass"]')).toBeVisible();
    await expect(searchForm.locator('select[name="diameter"]').first()).toBeVisible();
    await expect(searchForm.locator('select[name="propellantInfo"]')).toBeVisible();
    await expect(searchForm.locator('.availability input[value="available"]')).toBeChecked();
    await expect(searchForm.locator('button[type="submit"]')).toBeVisible();

    await searchForm.locator('select[name="manufacturer"]').selectOption({ label: 'Estes Industries' });
    await expect(searchForm.locator('select[name="manufacturer"]')).toHaveValue('Estes');

    await searchForm.locator('button[type="submit"]').click();
    await expect(page).toHaveTitle(/Search Results • ThrustCurve/);
    await expect(page.locator('#result-list_info')).toBeVisible();

    await page.getByRole('link', { name: 'A10' }).click();
    await expect(page).toHaveTitle(/Estes A10 • ThrustCurve/);
    await expect(page.locator('.img > img')).toBeVisible();
  });

  test('search by type and impulse class with compare', async ({ page }) => {
    await page.goto('/motors/search.html');
    const searchForm = page.locator('form[name="edit"]');
    await searchForm.locator('select[name="type"]').selectOption({ label: 'single-use' });
    await searchForm.locator('select[name="impulseClass"]').selectOption({ label: 'C' });
    await searchForm.locator('button[type="submit"]').click();

    await page.locator('#select-all').check();
    await page.locator('#compare').click();

    await expect(page.getByRole('link', { name: 'C11' })).toHaveText('C11');
  });

  test('search by manufacturer and flame color', async ({ page }) => {
    await page.goto('/motors/search.html');
    const searchForm = page.locator('form[name="edit"]');
    await searchForm.locator('select[name="manufacturer"]').selectOption({ label: 'AeroTech' });
    await searchForm.locator('select[name="flameColor"]').selectOption({ label: 'green' });
    await searchForm.locator('button[type="submit"]').click();

    await expect(page).toHaveTitle(/Search Results • ThrustCurve/);
    await expect(page.locator('#result-list_info')).toContainText(/11 entries/);
    await expect(page.getByRole('link', { name: 'G76G' })).toBeVisible();
  });

  test('search by smoke color', async ({ page }) => {
    await page.goto('/motors/search.html');
    const searchForm = page.locator('form[name="edit"]');
    await searchForm.locator('select[name="manufacturer"]').selectOption({ label: 'AeroTech' });
    await searchForm.locator('select[name="flameColor"]').selectOption({ label: '(all)' });
    await searchForm.locator('select[name="smokeColor"]').selectOption({ label: 'black' });
    await searchForm.locator('button[type="submit"]').click();

    await expect(page).toHaveTitle(/Search Results • ThrustCurve/);
    await expect(page.locator('#result-list_info')).toContainText(/20 entries/);
    await expect(page.locator('.odd').first().locator('td').first()).toHaveText('E11J');
  });
});

test.describe('guide', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
  });

  test('motor guide with rocket dimensions', async ({ page }) => {
    await page.goto('/mystuff/logout.html');
    await expect(page).toHaveTitle(/Rocket Motor Data • ThrustCurve/);

    await page.getByRole('link', { name: 'Match a Rocket' }).first().click();
    const guideForm = page.locator('form[name="guide"]');
    await guideForm.locator('input[name="bodyDiameter"]').fill('1');
    await guideForm.locator('select[name="bodyDiameterUnit"]').selectOption({ label: 'inches' });
    await guideForm.locator('input[name="weight"]').fill('3');
    await guideForm.locator('select[name="weightUnit"]').selectOption({ label: 'ounces' });
    await guideForm.locator('select[name="mmtDiameter"]').selectOption('24');
    await guideForm.locator('input[name="mmtLength"]').fill('80');
    await guideForm.locator('input[name="guideLength"]').fill('1');
    await guideForm.locator('select[name="guideLengthUnit"]').selectOption('meters');
    await guideForm.locator('button[type="submit"]').click();

    await expect(page.locator('.col-md-8 > p').first()).toContainText(/motors fit[\s\S]*the rocket/);
    await expect(page.getByRole('link', { name: 'C11' })).toHaveText('C11');
    await expect(page.locator('.odd').first().locator('.visible-md')).toHaveText('Estes');
    await expect(page.locator('.odd').first()).toContainText('10:1');

    await page.locator('.odd').first().locator('.fa').click();
    await expect(page.locator('.form-group').nth(2).locator('.form-control-static')).toContainText('good');
    await expect(page.getByRole('link', { name: 'Estes C11' })).toHaveText('Estes C11');
    await expect(page.locator('.form-group').nth(1).locator('.form-control-static')).toContainText('24 mm MMT');

    await page.getByRole('link', { name: 'complete results' }).click();
    await expect(page).toHaveTitle(/Motor Guide Complete Results • ThrustCurve/);
    await expect(page.getByText('slow off guide').first()).toBeVisible();

    await page.getByRole('link', { name: 'summary results' }).click();
    await page.locator('#result-list_filter input').fill('F24');
    await expect(page.getByRole('link', { name: 'F24W' })).toHaveText('F24W');
    await expect(page.locator('.odd').locator('.visible-md')).toContainText('AeroTech');
    await expect(page.locator('#result-list_info')).toContainText(/filtered from/);

    await page.locator('#result-list_filter input').fill(' \n');
    await expect(page.getByRole('link', { name: 'E20W' })).toHaveText('E20W');
  });

  test('guide with saved rocket (requires test user)', async ({ page }) => {
    await page.goto('/mystuff/logout.html');
    await expect(page).toHaveTitle(/Rocket Motor Data • ThrustCurve/);

    await page.getByRole('link', { name: 'Match a Rocket' }).first().click();
    const guideForm = page.locator('form[name="guide"]');
    await guideForm.locator('input[name="bodyDiameter"]').fill('1');
    await guideForm.locator('select[name="bodyDiameterUnit"]').selectOption({ label: 'inches' });
    await guideForm.locator('input[name="weight"]').fill('3');
    await guideForm.locator('select[name="weightUnit"]').selectOption({ label: 'ounces' });
    await guideForm.locator('select[name="mmtDiameter"]').selectOption('24');
    await guideForm.locator('input[name="mmtLength"]').fill('80');
    await guideForm.locator('input[name="guideLength"]').fill('1');
    await guideForm.locator('select[name="guideLengthUnit"]').selectOption('meters');
    await guideForm.locator('button[type="submit"]').click();

    await expect(page.getByRole('link', { name: 'complete results' }).first()).toBeVisible();

    await page.goto('/mystuff/login.html');
    const loginForm = page.locator('form[name="login"]');
    await loginForm.locator('input[name="username"]').fill('flier.fred@gmail.com');
    await loginForm.locator('input[name="password"]').fill('secret');
    await loginForm.locator('button[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes('login'), { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /My Stuff/ })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /My Stuff/ }).click();
    await page.getByRole('link', { name: 'Rockets', exact: true }).click();
    await expect(page).toHaveTitle(/My Rockets • ThrustCurve/);
    await expect(page.getByRole('link', { name: 'Alpha III' })).toHaveText('Alpha III');

    await page.getByRole('link', { name: 'Alpha III' }).click();
    await expect(page).toHaveTitle(/Alpha III • ThrustCurve/);
    await page.getByRole('link', { name: 'Match Rocket' }).click();
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveTitle(/Motor Guide Results • ThrustCurve/);
    await expect(page.locator('.main')).toContainText(/motors fit[\s\S]*Alpha III/);
    await expect(page.getByRole('link', { name: 'C6' })).toHaveText('C6');
    await expect(page.locator('#result-list tr').filter({ has: page.getByRole('link', { name: 'C6' }) }).locator('.visible-md')).toHaveText('Estes');

    await page.getByRole('link', { name: 'C6' }).click();
    await expect(page).toHaveTitle(/Estes C6 • ThrustCurve/);
    await expect(page.getByRole('link', { name: 'Estes Industries' })).toHaveText('Estes Industries');
    await expect(page.locator('.form-group').nth(1).locator('.form-control-static')).toHaveText('C6');

    await page.goBack();
    await expect(page).toHaveTitle(/Motor Guide Results • ThrustCurve/);

    await page.getByRole('link', { name: 'complete results' }).click();
    await expect(page).toHaveTitle(/Motor Guide Complete Results • ThrustCurve/);
    await expect(page.getByRole('link', { name: 'Alpha III' }).first()).toHaveText('Alpha III');

    await page.locator('select[name="result-list_length"]').selectOption({ label: 'all' });
    await expect(page.locator('#result-list_info')).toContainText(/12 of 12 entries/);

    await page.getByRole('link', { name: 'D21T' }).click();
    await expect(page).toHaveTitle(/AeroTech D21T • ThrustCurve/);
    await page.goBack();

    await page.getByRole('link', { name: 'summary results' }).click();
    await expect(page.getByRole('link', { name: 'most extreme motors' })).toBeVisible();
    await page.getByRole('link', { name: 'most extreme motors' }).click();
    await expect(page).toHaveTitle(/Motor Guide Top Motors • ThrustCurve/);
    await expect(page.getByText(/most extreme results/)).toBeVisible();

    await page.getByRole('link', { name: 'summary results' }).click();
    await page.getByRole('link', { name: 'compare them on a plot' }).click();
    await expect(page).toHaveTitle(/Motor Guide Motor Plot • ThrustCurve/);
    await expect(page.locator('.chart a').first()).toBeVisible();

    await page.locator('.chart a').first().click();
    await expect(page).toHaveTitle(/Motor Guide Run Details • ThrustCurve/);
    await expect(page.locator('div[role="form"] a[href*="/motors/"]')).toBeVisible();
  });
});

test.describe('browser', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
  });

  test('motor browser navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Browse by Type' }).first().click();
    await expect(page).toHaveTitle(/Motor Browser • ThrustCurve/);

    await page.getByRole('link', { name: 'Mid Power' }).click();
    await expect(page).toHaveTitle(/Motor Browser • ThrustCurve/);
    await expect(page.locator('.trail .current')).toContainText(/mid-power/);

    const lists = page.locator('.lists');
    await expect(lists.getByRole('link', { name: 'E', exact: true })).toHaveText('E');
    await expect(lists.getByRole('link', { name: 'F', exact: true })).toHaveText('F');
    await expect(lists.getByRole('link', { name: 'G', exact: true })).toHaveText('G');

    await lists.getByRole('link', { name: 'F', exact: true }).click();
    await expect(page.locator('.trail .current')).toContainText(/F class/);

    await expect(page.getByRole('link', { name: '24mm' }).or(page.getByRole('link', { name: '24 mm' })).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '29mm' }).or(page.getByRole('link', { name: '29 mm' })).first()).toBeVisible();
    await expect(page.getByRole('link', { name: '32mm' }).or(page.getByRole('link', { name: '32 mm' })).first()).toBeVisible();

    await lists.getByRole('link', { name: 'Blackjack', exact: true }).click();
    await expect(page.locator('.trail .current')).toContainText('Blackjack');

    await expect(page.getByRole('link', { name: 'F12J' })).toHaveText('F12J');
    await expect(page.getByRole('link', { name: 'F22J' })).toHaveText('F22J');
    await expect(page.getByRole('link', { name: 'F16-RCJ' })).toHaveText('F16-RCJ');
    await expect(page.locator('#motor-list .odd').first().locator('td').nth(1)).toHaveText('AeroTech');

    await page.getByRole('link', { name: 'F22J' }).click();
    await expect(page).toHaveTitle(/AeroTech F22J • ThrustCurve/);
    await page.goBack();

    await page.locator('a[href*="burnTime=6"]').click();
    await expect(page.locator('.trail .current')).toContainText(/6\s*s burn time/);

    await page.getByRole('link', { name: 'F class' }).click();
    await expect(page.locator('.trail .current')).toContainText(/F class/);

    await page.locator('a[href*="burnTime=3"]').click();
    await expect(page.locator('.trail .current')).toContainText(/3\s*s burn time/);
    await expect(page.getByRole('heading', { name: 'Matching Motors' })).toHaveText('Matching Motors');
    await expect(page.getByRole('link', { name: 'F25W' })).toHaveText('F25W');

    await page.getByRole('link', { name: 'F25W' }).click();
    await expect(page).toHaveTitle(/AeroTech F25W • ThrustCurve/);
    await page.goBack();

    await page.locator('#select-all').check();
    await page.locator('#compare').click();
    await expect(page).toHaveTitle(/Compare Motors • ThrustCurve/);
    await expect(page.locator('.col-md-8 > p').first()).toContainText(/You selected[\s\S]*motors for comparison/);

    await page.goBack();
    await expect(page).toHaveTitle(/Motor Browser • ThrustCurve/);
    await expect(page.locator('.trail .current')).toContainText(/3\s*s burn time/);
  });
});

function labeledValue(page: Page, label: string) {
  return page.locator('.form-group', { has: page.locator('label', { hasText: new RegExp(`^${label}$`) }) })
             .locator('.form-control-static');
}

test.describe('mystuff', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
    await login(page, 'flier.fred@gmail.com');
  });

  test('add and remove favorite motor', async ({ page }) => {
    const { path, designation } = perProject({
      chromium: { path: '/motors/Estes/C6/', designation: 'C6' },
      webkit: { path: '/motors/AeroTech/F25W/', designation: 'F25W' },
    });
    const favorites = page.locator('#favorite-list');
    try {
      await page.goto(path);
      await page.locator('a.favorite[title="add favorite"]').click();
      await expect(page).toHaveTitle(/Favorite Motors • ThrustCurve/);
      await expect(favorites.getByRole('link', { name: designation, exact: true })).toBeVisible();

      await favorites.locator('tr', { has: page.getByRole('link', { name: designation, exact: true }) })
                     .locator('a.favorite[title="remove favorite"]').click();
      await expect(page).toHaveTitle(/Favorite Motors • ThrustCurve/);
      await expect(favorites.getByRole('link', { name: designation, exact: true })).toHaveCount(0);
    } finally {
      await page.goto(path);
      const remove = page.locator('a.favorite[title="remove favorite"]');
      if (await remove.count() > 0)
        await remove.click();
    }
  });

  test('motor details use saved in/oz preferences', async ({ page }) => {
    // Fred has defaultUnits in/oz in the test DB. Site defaults are mm/g.
    await page.goto('/mystuff/logout.html');
    await page.goto('/motors/Estes/C6/');
    await expect(labeledValue(page, 'Diameter')).toHaveText(/18\s*mm/);
    await expect(labeledValue(page, 'Length')).toHaveText(/70\s*mm/);
    await expect(labeledValue(page, 'Prop. Weight')).toHaveText(/11\s*g/);

    await login(page, 'flier.fred@gmail.com');

    await page.goto('/mystuff/preferences.html');
    await expect(page).toHaveTitle(/Preferences • ThrustCurve/);
    const prefs = page.locator('form[name="prefs"]');
    await expect(prefs.locator('select[name="defaultUnits"]')).toHaveValue('in/oz');
    await expect(prefs.locator('select[name="lengthUnit"]')).toHaveValue('in');
    await expect(prefs.locator('select[name="massUnit"]')).toHaveValue('oz');

    await page.goto('/motors/Estes/C6/');
    await expect(labeledValue(page, 'Diameter')).toHaveText(/18\s*mm/);
    await expect(labeledValue(page, 'Length')).toHaveText(/2\.76\s*in/);
    await expect(labeledValue(page, 'Prop. Weight')).toHaveText(/0\.4\s*oz/);

    await page.goto('/mystuff/rocket/new/edit.html');
    const form = page.locator('form[name="edit-rocket"]');
    await expect(form.locator('select[name="bodyDiameterUnit"]')).toHaveValue('in');
    await expect(form.locator('select[name="weightUnit"]')).toHaveValue('oz');
  });

  test('delete account page explains what is kept', async ({ page }) => {
    await page.goto('/mystuff/profile.html');
    await page.getByRole('link', { name: 'delete this account' }).click();
    await expect(page).toHaveTitle(/Delete Account • ThrustCurve/);
    await expect(page.getByText('Deleted User')).toBeVisible();
    await expect(page.getByText(/rockets will be deleted/)).toBeVisible();
    await expect(page.locator('form[name="delete"] input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete My Account' })).toBeVisible();
  });

  test('create and delete rocket', async ({ page }) => {
    const name = perProject({
      chromium: 'ZZ e2e rocket chromium',
      webkit: 'ZZ e2e rocket webkit',
    });
    let rocketUrl: string | undefined;
    try {
      await page.goto('/mystuff/rocket/new/edit.html');
      await expect(page).toHaveTitle(/Add Rocket • ThrustCurve/);
      const form = page.locator('form[name="edit-rocket"]');
      await form.locator('input[name="name"]').fill(name);
      await form.locator('input[name="public"]').uncheck();
      await form.locator('input[name="bodyDiameter"]').fill('1');
      await form.locator('select[name="bodyDiameterUnit"]').selectOption('in');
      await form.locator('input[name="weight"]').fill('3');
      await form.locator('select[name="weightUnit"]').selectOption('oz');
      await form.locator('select[name="mmtDiameter"]').selectOption('24');
      await form.locator('input[name="mmtLength"]').fill('80');
      await form.locator('select[name="mmtLengthUnit"]').selectOption('mm');
      await form.locator('button[type="submit"]').click();

      await expect(page).toHaveTitle(new RegExp(`${name} • ThrustCurve`));
      rocketUrl = page.url();

      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('link', { name: 'delete it entirely' }).click();
      await expect(page).toHaveTitle(/My Rockets • ThrustCurve/);
      await expect(page.getByRole('link', { name })).toHaveCount(0);
      rocketUrl = undefined;
    } finally {
      if (rocketUrl)
        await page.goto(rocketUrl.replace(/\/?$/, '/delete.html'));
    }
  });
});

test.describe('admin', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1233, height: 872 });
    await login(page, 'admin.adam@gmail.com');
  });

  test('delete account lookup rejects an unknown email', async ({ page }) => {
    await page.goto('/admin/contributors/delete.html');
    await expect(page).toHaveTitle(/Delete Account • ThrustCurve/);
    await page.locator('form[name="lookup"] input[name="email"]').fill('nobody-e2e@example.com');
    await page.getByRole('button', { name: 'Look Up' }).click();
    await expect(page.getByText('No account with that email address.')).toBeVisible();
  });

  test('certification org and docs pages', async ({ page }) => {
    await page.goto('/admin/certorgs/');
    await expect(page).toHaveTitle(/Certification Organizations • ThrustCurve/);
    await page.locator('#certorg-list').getByRole('link').first().click();
    await expect(page).toHaveTitle(/Edit Certification Org • ThrustCurve/);
    await expect(page.locator('.form-group', { has: page.locator('label[for="motors"]') })
                     .locator('.form-control-static')).toHaveText(/^\d[\d,]*$/);

    await page.goto('/admin/certdocs/');
    await expect(page).toHaveTitle(/Certification Docs • ThrustCurve/);
  });

  test('set, change and clear propellant colors', async ({ page }) => {
    // these propellants have no stored info, so clearing restores the original state
    const { mfr, propellant } = perProject({
      chromium: { mfr: 'Estes', propellant: 'composite' },
      webkit: { mfr: 'AeroTech', propellant: 'White Thunder' },
    });
    const row = () => page.locator('tr.entry')
      .filter({ has: page.locator('td').first().getByText(mfr, { exact: true }) })
      .filter({ has: page.getByRole('link', { name: propellant, exact: true }) });
    const flame = () => row().locator('input[name="flameColor"]');
    const save = () => row().locator('button[type="submit"]');

    try {
      await page.goto('/admin/propellants/');
      await expect(flame()).toHaveValue('');

      await flame().fill('e2e-red');
      await save().click();
      await expect(flame()).toHaveValue('e2e-red');

      await flame().fill('e2e-blue');
      await save().click();
      await expect(flame()).toHaveValue('e2e-blue');

      await flame().fill('');
      await save().click();
      await expect(flame()).toHaveValue('');
    } finally {
      await page.request.post('/admin/propellants/', { form: { manufacturer: mfr, name: propellant } });
    }
  });
});
