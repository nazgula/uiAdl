const { test, expect } = require('@playwright/test');

function projectSlug(testInfo) {
  return `e2e_cmp_${testInfo.testId}`;
}

function buildResponse(marker, reasoning) {
  return {
    id: 'msg_canned_e2e',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5-20251001',
    stop_reason: 'end_turn',
    content: [{
      type: 'text',
      text: `<reasoning>\n${reasoning}\n</reasoning>\n` +
        `<!DOCTYPE html><html><body><div class="panel">${marker}</div></body></html>`
    }],
    usage: { input_tokens: 50, output_tokens: 80 }
  };
}

async function setupProject(page, name) {
  await page.goto('/');
  await page.fill('#project-name', name);
}

async function addDecisionViaUI(page, category, text) {
  await page.selectOption('#new-category', category);
  await page.fill('#new-text', text);
  await page.locator('#panel-decisions button', { hasText: '+' }).first().click();
}

async function generateOnce(page, marker, reasoning) {
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildResponse(marker, reasoning))
    });
  });
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

test('generate creates a live tab in the tab strip', async ({ page }) => {
  await generateOnce(page, 'M1', 'R1');
  await addDecisionViaUI(page, 'ui', 'Tab1');
  await page.click('#generate-btn');

  const strip = page.locator('#tab-strip');
  await expect(strip).toBeVisible();
  const tabs = strip.locator('.render-tab');
  await expect(tabs).toHaveCount(1);
  await expect(tabs.first()).toHaveClass(/live/);
  await expect(tabs.first()).toHaveClass(/active/);
});

test('closing the live tab via X requires confirmation', async ({ page }) => {
  await generateOnce(page, 'M1', 'R1');
  await addDecisionViaUI(page, 'ui', 'Confirm test');
  await page.click('#generate-btn');

  const strip = page.locator('#tab-strip');
  await expect(strip.locator('.render-tab')).toHaveCount(1);

  // Cancel keeps the tab
  page.once('dialog', d => d.dismiss());
  await strip.locator('.render-tab .tab-x').first().click();
  await expect(strip.locator('.render-tab')).toHaveCount(1);

  // Accept closes the tab
  page.once('dialog', d => d.accept());
  await strip.locator('.render-tab .tab-x').first().click();
  await expect(strip.locator('.render-tab')).toHaveCount(0);
});

test('a second generate demotes previous live to a closeable unsaved tab', async ({ page }) => {
  // First generation
  let callCount = 0;
  const responses = [
    buildResponse('ALPHA', 'A-REASON'),
    buildResponse('BETA',  'B-REASON')
  ];
  await page.route('**/api/generate', async (route) => {
    const body = JSON.stringify(responses[Math.min(callCount, 1)]);
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await addDecisionViaUI(page, 'ui', 'Demote test');
  await page.click('#generate-btn');
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(1);

  await page.click('#generate-btn');
  const tabs = page.locator('#tab-strip .render-tab');
  await expect(tabs).toHaveCount(2);
  // Exactly one tab should be live (the most recent, the rightmost)
  await expect(tabs.locator('.live')).toHaveCount(0); // class is on the tab itself
  // Verify exactly one .render-tab.live exists
  await expect(page.locator('#tab-strip .render-tab.live')).toHaveCount(1);

  // Closing the demoted (older, non-live) tab should NOT prompt
  let dialogShown = false;
  page.on('dialog', () => { dialogShown = true; });
  await tabs.first().locator('.tab-x').click();
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(1);
  expect(dialogShown).toBe(false);
});

test('opening a saved render from History creates a tab; clicking again focuses existing tab', async ({ page }) => {
  await generateOnce(page, 'SAVED', 'S-REASON');
  await addDecisionViaUI(page, 'ui', 'Open from history');

  await page.click('#generate-btn');
  await page.click('#save-render-btn');

  // Saved tab is now in the strip + history. Close it so we can test re-opening.
  page.once('dialog', d => d.accept()); // shouldn't fire — saved tab has no guard
  await page.locator('#tab-strip .render-tab .tab-x').first().click();
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(0);

  // Open from history
  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await row.locator('button.history-label').click();
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(1);

  // Switch to history and click again — should focus, not duplicate
  await page.click('#view-history');
  await row.locator('button.history-label').click();
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(1);
});

test('checking the second tab auto-locks a compare pair and splits the render area', async ({ page }) => {
  let callCount = 0;
  const responses = [
    buildResponse('ALPHA', 'A-REASON'),
    buildResponse('BETA',  'B-REASON'),
    buildResponse('GAMMA', 'G-REASON')
  ];
  await page.route('**/api/generate', async (route) => {
    const body = JSON.stringify(responses[Math.min(callCount, 2)]);
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await addDecisionViaUI(page, 'ui', 'Compare test');
  await page.click('#generate-btn');
  await page.click('#generate-btn');
  await page.click('#generate-btn');

  const checkboxes = page.locator('#tab-strip .render-tab input[type=checkbox]');
  const compareView = page.locator('#preview-compare');

  // Single check: still single view
  await checkboxes.nth(0).check();
  await expect(compareView).toBeHidden();

  // Second check on a paired tab → split appears immediately, no button
  await checkboxes.nth(1).check();
  await expect(page.locator('#compare-status')).toBeVisible();
  // Active tab is the most recent (GAMMA), which is NOT in the pair → still single
  await expect(compareView).toBeHidden();

  // Click on the first paired tab → split shows
  await page.locator('#tab-strip .render-tab').nth(0).click();
  await expect(compareView).toBeVisible();
  await expect(compareView.locator('.compare-col')).toHaveCount(2);
  // Single-view panels are all hidden — no double-render
  await expect(page.locator('#preview-render')).toBeHidden();
  await expect(page.locator('#preview-source')).toBeHidden();
  await expect(page.locator('#preview-reasoning')).toBeHidden();
  await expect(page.locator('#preview-history')).toBeHidden();

  // Top P/S/R buttons control both columns at once. Switch to Source.
  await page.click('#view-source');
  await expect(compareView.locator('.compare-col pre[data-cmp-source]').nth(0)).toBeVisible();
  await expect(compareView.locator('.compare-col pre[data-cmp-source]').nth(1)).toBeVisible();
  await expect(compareView.locator('.compare-col iframe[data-cmp-frame]').first()).toBeHidden();

  // The third (non-paired) checkbox is disabled while the pair is locked
  await expect(checkboxes.nth(2)).toBeDisabled();

  // Click on the third (non-paired) tab → split disappears, single view returns
  await page.locator('#tab-strip .render-tab').nth(2).click();
  await expect(compareView).toBeHidden();

  // Re-click a paired tab → split returns
  await page.locator('#tab-strip .render-tab').nth(0).click();
  await expect(compareView).toBeVisible();

  // Unchecking a paired tab dissolves the pair
  await checkboxes.nth(0).uncheck();
  await expect(compareView).toBeHidden();
  await expect(page.locator('#compare-status')).toBeHidden();
  await expect(checkboxes.nth(2)).toBeEnabled();
});

test('closing a paired tab while in split exits the split immediately', async ({ page }) => {
  let callCount = 0;
  const responses = [buildResponse('ALPHA','A-R'), buildResponse('BETA','B-R')];
  await page.route('**/api/generate', async (route) => {
    const body = JSON.stringify(responses[Math.min(callCount, 1)]);
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await addDecisionViaUI(page, 'ui', 'Pair close test');
  await page.click('#generate-btn');
  await page.click('#generate-btn');

  const checkboxes = page.locator('#tab-strip .render-tab input[type=checkbox]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  // Active tab (the second, BETA) is in the pair → split visible
  await expect(page.locator('#preview-compare')).toBeVisible();

  // Close the active live tab (with confirm)
  page.once('dialog', d => d.accept());
  await page.locator('#tab-strip .render-tab').nth(1).locator('.tab-x').click();
  // Pair dissolves; split is gone
  await expect(page.locator('#preview-compare')).toBeHidden();
  await expect(page.locator('#compare-status')).toBeHidden();
});

test('rename a saved render updates the History label and persists', async ({ page }) => {
  await generateOnce(page, 'NAME-ME', 'N-REASON');
  await addDecisionViaUI(page, 'ui', 'Rename test');

  await page.click('#generate-btn');
  await page.click('#save-render-btn');

  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await row.locator('button[title="Rename"]').click();
  const input = row.locator('input[type="text"]');
  await input.fill('Custom Name');
  await input.press('Enter');

  // History row label updated
  await expect(page.locator('#history-list > div').first().locator('.history-label')).toHaveText('Custom Name');

  // Reload page and verify it persists
  await page.reload();
  await page.click('#view-history');
  await expect(page.locator('#history-list > div').first().locator('.history-label')).toHaveText('Custom Name');
});

test('per-tab view state survives tab switching', async ({ page }) => {
  let callCount = 0;
  const responses = [
    buildResponse('ALPHA', 'ALPHA-R'),
    buildResponse('BETA', 'BETA-R')
  ];
  await page.route('**/api/generate', async (route) => {
    const body = JSON.stringify(responses[Math.min(callCount, 1)]);
    callCount++;
    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });

  await addDecisionViaUI(page, 'ui', 'Per-tab view');
  await page.click('#generate-btn');
  await page.click('#generate-btn');

  const tabs = page.locator('#tab-strip .render-tab');
  await expect(tabs).toHaveCount(2);

  // On the active (second, BETA) tab → switch to Source
  await page.click('#view-source');
  await expect(page.locator('#preview-source')).toBeVisible();
  await expect(page.locator('#source-code')).toContainText('BETA');

  // Switch to first (ALPHA) tab — should default back to its own view (render)
  await tabs.nth(0).click();
  await expect(page.locator('#preview-render')).toBeVisible();

  // Switch back to BETA — Source view restored
  await tabs.nth(1).click();
  await expect(page.locator('#preview-source')).toBeVisible();
  await expect(page.locator('#source-code')).toContainText('BETA');
});
