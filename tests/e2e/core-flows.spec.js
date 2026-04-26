// E2E coverage for the 6 core user flows from
// specs/phase-0-pre-publication-cleanup-2026-04-26/plan.md §3.3.
// /api/generate is mocked with a canned <reasoning>...</reasoning>+HTML
// payload so no real Anthropic credits are consumed. Each test uses a
// unique project slug to keep on-disk state under renders/{slug}/ isolated;
// afterEach cleans up the project file and any saved renders for that slug.
//
// Skipped from the 8-flow list:
// - (7) Error state — covered indirectly by tests that assert no crash.
// - (8) Empty state — trivial, low signal-to-effort for a senior reviewer.

const { test, expect, request } = require('@playwright/test');
const { CANNED_RESPONSE, CANNED_HTML_MARKER, CANNED_REASONING } =
  require('./fixtures/canned-generation');

function uniqueProjectName(testInfo) {
  // Match server slug rules: lowercase + [^a-z0-9_-] → '_'
  return `e2e_${testInfo.testId}_${Date.now()}`;
}

async function setupProject(page, name) {
  // Navigate, then seed an empty fresh-state project under a unique name.
  // localStorage is clean per Playwright context, so we just set the
  // project name input to drive projectSlug() to our unique value.
  await page.goto('/');
  await page.fill('#project-name', name);
  // Trigger the same listener path the UI uses on user input
  await page.locator('#project-name').dispatchEvent('input');
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
  // The "+" button is the only button inside the add-decision form row
  await page.locator('#panel-decisions button', { hasText: '+' }).first().click();
}

test.afterEach(async ({ page }, testInfo) => {
  const slug = testInfo._slug;
  if (!slug) return;
  const ctx = await request.newContext({ baseURL: 'http://localhost:8080' });
  try {
    // Drop saved renders for this slug, if any
    const meta = await ctx.get(`/api/renders/${slug}`).then(r => r.ok() ? r.json() : []);
    for (const entry of meta) {
      await ctx.delete(`/api/renders/${slug}/${entry.id}`);
    }
    await ctx.delete(`/api/projects/${slug}`);
  } finally {
    await ctx.dispose();
  }
});

test.beforeEach(async ({ page }, testInfo) => {
  const name = uniqueProjectName(testInfo);
  testInfo._slug = name; // server slug rules already satisfied
  await setupProject(page, name);
});

// ─── 1. Add a decision (entity) ──────────────────────────────
test('add a typed decision (entity) appears in the decision list', async ({ page }, testInfo) => {
  await addDecisionViaUI(page, 'entity', 'Customer record');

  const list = page.locator('#decision-list');
  await expect(list).toContainText('entity');
  await expect(list).toContainText('Customer record');
  await expect(page.locator('#stats')).toContainText('1 of 1 active');
});

// ─── 2. Toggle a decision active / inactive ───────────────────
test('toggling a decision flips its active count', async ({ page }, testInfo) => {
  await addDecisionViaUI(page, 'flow', 'Login → dashboard');

  const stats = page.locator('#stats');
  await expect(stats).toContainText('1 of 1 active');

  // Click the row checkbox to deactivate
  await page.locator('#decision-list input[type="checkbox"]').first().click();
  await expect(stats).toContainText('0 of 1 active');

  // Toggle back
  await page.locator('#decision-list input[type="checkbox"]').first().click();
  await expect(stats).toContainText('1 of 1 active');
});

// ─── 3. Generate UI → wireframe HTML appears in iframe (mocked) ─
test('generate produces an iframe with the canned wireframe content', async ({ page }, testInfo) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'ItemList component');

  await page.click('#generate-btn');

  // Wait for the iframe to become visible
  const frame = page.locator('#preview-frame');
  await expect(frame).not.toHaveClass(/hidden/);

  // Assert against the iframe document — user-observable content,
  // not class names. The marker + sample item text both come from
  // the canned HTML body.
  const inner = page.frameLocator('#preview-frame');
  await expect(inner.locator('body')).toContainText(CANNED_HTML_MARKER);
  await expect(inner.locator('body')).toContainText('alpha — open');
});

// ─── 4. Save the rendered output → appears in history ─────────
test('saving a render adds it to the history list', async ({ page }, testInfo) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'SaveButton');

  await page.click('#generate-btn');
  // Wait for save button to become available (renderPreview unhides it)
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);

  await page.click('#save-render-btn');

  // saveRender() switches the view to history on success
  const list = page.locator('#history-list');
  await expect(list).toBeVisible();
  // One history entry: a row containing the R button (since reasoning
  // was present in the canned response). Use the row-level button count.
  const rows = list.locator('> div');
  await expect(rows).toHaveCount(1);
});

// ─── 5. Rate a saved render good ──────────────────────────────
test('rating a saved render good marks the row good', async ({ page }, testInfo) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'ui', 'RateMe');

  await page.click('#generate-btn');
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);
  await page.click('#save-render-btn');

  const row = page.locator('#history-list > div').first();
  await expect(row).toBeVisible();

  await row.locator('button[title="Good"]').click();

  // After rating, loadHistory() re-renders and the rating column shows "good"
  await expect(row).toContainText('good');
});

// ─── 6. View saved render's reasoning via R → Analysis tab ─────
test('clicking R on a saved render shows reasoning in the analysis tab', async ({ page }, testInfo) => {
  await mockGenerate(page);
  await addDecisionViaUI(page, 'flow', 'Open detail');

  await page.click('#generate-btn');
  await expect(page.locator('#save-render-btn')).not.toHaveClass(/hidden/);
  await page.click('#save-render-btn');

  const row = page.locator('#history-list > div').first();
  await row.locator('button[title="View reasoning"]').click();

  // Analysis view should now be visible with the [REASONING] header and
  // a recognizable line from the canned reasoning content.
  const content = page.locator('#analysis-content');
  await expect(content).toBeVisible();
  await expect(content).toContainText('[REASONING]');
  await expect(content).toContainText('Container & Layout');
});
