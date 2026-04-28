const { test, expect } = require('@playwright/test');

function projectSlug(testInfo) {
  return `e2e_ng_${testInfo.testId}`;
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

async function openAssess(page) {
  await page.click('#assess-btn');
  await expect(page.locator('.assess-popover')).toBeVisible();
}

async function closeAssessByOutsideClick(page) {
  await page.locator('header').click();
  await expect(page.locator('.assess-popover')).toHaveCount(0);
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

test('grade + note set via Assess popover persist to history and snapshot block appears', async ({ page }) => {
  await generateOnce(page, 'M1', 'R1');
  await addDecisionViaUI(page, 'ui', 'Active UI decision');
  await addDecisionViaUI(page, 'flow', 'Active flow');
  await addDecisionViaUI(page, 'constraint', 'Inactive constraint');
  await page.locator('#decision-list .decision-row').last().locator('input[type=checkbox]').uncheck();

  await page.click('#generate-btn');
  await expect(page.locator('#tab-strip .render-tab')).toHaveCount(1);

  // Open Assess popover from the toolbar
  await openAssess(page);
  // Pick grade 4
  await page.locator('.assess-popover .ap-grade button', { hasText: '4' }).click();
  await expect(page.locator('.assess-popover .ap-grade button.active')).toHaveText('4');
  // Tab strip grade badge updates
  await expect(page.locator('#tab-strip .render-tab .tab-grade')).toHaveText('4');
  // Type note
  await page.locator('.assess-popover .ap-note').fill('structure feels right but spacing is off');
  await closeAssessByOutsideClick(page);

  // Snapshot is collapsed by default; expand and check contents
  await page.click('#view-reasoning');
  await expect(page.locator('#reasoning-snapshot')).toBeHidden();
  await page.click('#reasoning-snapshot-toggle');
  await expect(page.locator('#reasoning-snapshot')).toBeVisible();
  await expect(page.locator('#reasoning-snapshot')).toContainText('Active UI decision');
  await expect(page.locator('#reasoning-snapshot')).toContainText('Active flow');
  await expect(page.locator('#reasoning-snapshot')).not.toContainText('Inactive constraint');

  // Save the render
  await page.click('#save-render-btn');
  await expect(page.locator('#save-render-btn')).toBeHidden();

  // History row shows grade badge + note indicator
  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await expect(row.locator('.hist-grade.set')).toHaveText('4');
  await expect(row.locator('.hist-note')).toBeVisible();

  // Reload + reopen restores everything
  await page.reload();
  await page.click('#view-history');
  const row2 = page.locator('#history-list > div').first();
  await expect(row2.locator('.hist-grade.set')).toHaveText('4');
  await row2.locator('button.history-label').click();
  await expect(page.locator('#tab-strip .render-tab .tab-grade')).toHaveText('4');
  // Open Assess popover and verify values
  await openAssess(page);
  await expect(page.locator('.assess-popover .ap-note')).toHaveValue('structure feels right but spacing is off');
  await expect(page.locator('.assess-popover .ap-grade button.active')).toHaveText('4');
});

test('PATCH path: changing grade/note on a saved render persists across reload', async ({ page }) => {
  await generateOnce(page, 'M1', 'R1');
  await addDecisionViaUI(page, 'ui', 'Patch test');
  await page.click('#generate-btn');
  await page.click('#save-render-btn');
  await expect(page.locator('#save-render-btn')).toBeHidden();

  await openAssess(page);
  await page.locator('.assess-popover .ap-grade button', { hasText: '2' }).click();
  await page.locator('.assess-popover .ap-note').fill('persistent note');
  await closeAssessByOutsideClick(page);
  // Tiny pause for PATCH flush
  await page.waitForTimeout(150);

  await page.reload();
  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await expect(row.locator('.hist-grade.set')).toHaveText('2');
  await expect(row.locator('.hist-note')).toBeVisible();
  await row.locator('button.history-label').click();
  await openAssess(page);
  await expect(page.locator('.assess-popover .ap-note')).toHaveValue('persistent note');
  await expect(page.locator('.assess-popover .ap-grade button.active')).toHaveText('2');
});

test('clearing grade and note on a saved render persists as empty/null', async ({ page }) => {
  await generateOnce(page, 'M1', 'R1');
  await addDecisionViaUI(page, 'ui', 'Clear test');
  await page.click('#generate-btn');

  await openAssess(page);
  await page.locator('.assess-popover .ap-grade button', { hasText: '2' }).click();
  await page.locator('.assess-popover .ap-note').fill('temporary');
  await closeAssessByOutsideClick(page);

  await page.click('#save-render-btn');
  await expect(page.locator('#save-render-btn')).toBeHidden();

  // Open Assess, clear grade and note
  await openAssess(page);
  await page.locator('.assess-popover .ap-clear').click();
  await expect(page.locator('.assess-popover .ap-grade button.active')).toHaveCount(0);
  await page.locator('.assess-popover .ap-note').fill('');
  await closeAssessByOutsideClick(page);
  await page.waitForTimeout(150);

  await page.reload();
  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await expect(row.locator('.hist-grade.empty')).toBeVisible();
  await expect(row.locator('.hist-note')).toHaveCount(0);
});

test('older render without snapshot shows pre-Phase 2 message', async ({ page, request }, testInfo) => {
  const slug = projectSlug(testInfo);
  const res = await request.post(`/api/renders/${slug}`, {
    data: { html: '<html><body>old</body></html>', reasoning: 'old reasoning' }
  });
  expect(res.ok()).toBeTruthy();

  await page.reload();
  await page.click('#view-history');
  const row = page.locator('#history-list > div').first();
  await row.locator('button.history-label').click();
  await page.click('#view-reasoning');
  await page.click('#reasoning-snapshot-toggle');
  await expect(page.locator('#reasoning-snapshot')).toContainText('Snapshot not captured');
});

test('split view: per-column Assess button opens popover for that column', async ({ page }) => {
  let n = 0;
  const responses = [
    buildResponse('ALPHA', 'A-REASON'),
    buildResponse('BETA',  'B-REASON')
  ];
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(responses[Math.min(n++, 1)]) });
  });

  await addDecisionViaUI(page, 'ui', 'Split assess');
  await page.click('#generate-btn');
  await page.click('#generate-btn');
  // Two tabs; check both checkboxes to lock pair
  const checkboxes = page.locator('#tab-strip .render-tab input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();
  // Click into the focused tab to ensure split is visible
  await page.locator('#tab-strip .render-tab').nth(1).click();
  await expect(page.locator('#preview-compare')).toBeVisible();

  // Toolbar Assess button is hidden in split
  await expect(page.locator('#assess-btn')).toBeHidden();

  // Each column has an Assess button
  const colAssess = page.locator('#preview-compare [data-assess-col]');
  await expect(colAssess).toHaveCount(2);

  // Open assess on second column, set grade 3
  await colAssess.nth(1).click();
  await expect(page.locator('.assess-popover')).toBeVisible();
  await page.locator('.assess-popover .ap-grade button', { hasText: '3' }).click();
  // Column button reflects state
  await expect(colAssess.nth(1)).toContainText('3');
});
