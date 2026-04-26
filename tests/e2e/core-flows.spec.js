const { test, expect } = require('@playwright/test');
const { CANNED_RESPONSE, CANNED_HTML_MARKER } = require('./fixtures/canned-generation');

function projectSlug(testInfo) {
  return `e2e_${testInfo.testId}`;
}

async function setupProject(page, name) {
  await page.goto('/');
  await page.fill('#project-name', name);
}

async function mockGenerate(page) {
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CANNED_RESPONSE),
    });
  });
}

async function addDecisionViaUI(page, category, text) {
  await page.selectOption('#new-category', category);
  await page.fill('#new-text', text);
  await page.locator('#panel-decisions button', { hasText: '+' }).first().click();
}

test.beforeEach(async ({ page }, testInfo) => {
  await setupProject(page, projectSlug(testInfo));
});

test.afterEach(async ({ request }, testInfo) => {
  const slug = projectSlug(testInfo);
  const res = await request.get(`/api/renders/${slug}`);
  const meta = res.ok() ? await res.json() : [];
  await Promise.all(meta.map(entry => request.delete(`/api/renders/${slug}/${entry.id}`)));
  await request.delete(`/api/projects/${slug}`);
});

test('add a typed decision (entity) appears in the decision list', async ({ page }) => {
  await addDecisionViaUI(page, 'entity', 'Customer record');

  const list = page.locator('#decision-list');
  await expect(list).toContainText('entity');
  await expect(list).toContainText('Customer record');
  await expect(page.locator('#stats')).toContainText('1 of 1 active');
});

test('toggling a decision flips its active count', async ({ page }) => {
  await addDecisionViaUI(page, 'flow', 'Login → dashboard');

  const stats = page.locator('#stats');
  await expect(stats).toContainText('1 of 1 active');

  await page.locator('#decision-list input[type="checkbox"]').first().click();
  await expect(stats).toContainText('0 of 1 active');

  await page.locator('#decision-list input[type="checkbox"]').first().click();
  await expect(stats).toContainText('1 of 1 active');
});

test('generate produces an iframe with the canned wireframe content', async ({ page }) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'ItemList component');

  await page.click('#generate-btn');

  const frame = page.locator('#preview-frame');
  await expect(frame).not.toHaveClass(/hidden/);

  const inner = page.frameLocator('#preview-frame');
  await expect(inner.locator('body')).toContainText(CANNED_HTML_MARKER);
  await expect(inner.locator('body')).toContainText('alpha — open');
});

test('saving a render adds it to the history list', async ({ page }) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'SaveButton');

  await page.click('#generate-btn');
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);
  await page.click('#save-render-btn');

  const list = page.locator('#history-list');
  await expect(list).toBeVisible();
  const rows = list.locator('> div');
  await expect(rows).toHaveCount(1);
});

test('rating a saved render good marks the row good', async ({ page }) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'RateMe');

  await page.click('#generate-btn');
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);
  await page.click('#save-render-btn');

  const row = page.locator('#history-list > div').first();
  await expect(row).toBeVisible();

  await row.locator('button[title="Good"]').click();

  await expect(row).toContainText('good');
});

test('clicking R on a saved render shows reasoning in the analysis tab', async ({ page }) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'flow', 'Open detail');

  await page.click('#generate-btn');
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);
  await page.click('#save-render-btn');

  const row = page.locator('#history-list > div').first();
  await row.locator('button[title="View reasoning"]').click();

  const content = page.locator('#analysis-content');
  await expect(content).toBeVisible();
  await expect(content).toContainText('[REASONING]');
  await expect(content).toContainText('Container & Layout');
});
