const { test, expect } = require('@playwright/test');

function projectSlug(testInfo) {
  return `e2e_pi_${testInfo.testId}`;
}

function genResponse(marker, reasoning) {
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

function consultResponse(renderIds) {
  const payload = {
    proposedPrompt: 'PROPOSED-PROMPT-V2\nLine A\nLine B\nLine C',
    grades: renderIds.map((id, i) => ({ renderId: id, grade: 4 - i, rationale: `r${i}` })),
    limitsNotes: 'Vague PDL items recur in flow category.'
  };
  return {
    id: 'msg_consult_e2e',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-6',
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify(payload) }],
    usage: { input_tokens: 200, output_tokens: 200 }
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

async function generateAndSave(page, marker, reasoning, grade) {
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(genResponse(marker, reasoning)) });
  }, { times: 1 });
  await page.click('#generate-btn');
  await expect(page.locator('#preview-frame')).toBeVisible();
  // Set grade via assess popover
  await page.click('#assess-btn');
  await expect(page.locator('.assess-popover')).toBeVisible();
  await page.locator('.assess-popover .ap-grade button', { hasText: String(grade) }).click();
  // Close popover and save
  await page.locator('header').first().click();
  await page.click('#save-render-btn');
  await expect(page.locator('#save-render-btn')).toBeHidden();
}

test.beforeEach(async ({ page }, testInfo) => {
  await setupProject(page, projectSlug(testInfo));
  await addDecisionViaUI(page, 'flow', 'Customer signs up');
});

test.afterEach(async ({ request }, testInfo) => {
  const slug = projectSlug(testInfo);
  const res = await request.get(`/api/renders/${slug}`);
  const meta = res.ok() ? await res.json() : [];
  await Promise.all(meta.map(entry => request.delete(`/api/renders/${slug}/${entry.id}`)));
  await request.delete(`/api/projects/${slug}`);
});

test('Improve button is disabled with fewer than 3 graded renders', async ({ page }) => {
  await page.click('#tab-prompt');
  const btn = page.locator('#improve-prompt-btn');
  await expect(btn).toBeDisabled();
  await expect(page.locator('#improve-helper')).toContainText('Grade 3 more');

  await generateAndSave(page, 'X1', 'R1', 4);
  await page.click('#tab-prompt');
  await expect(page.locator('#improve-helper')).toContainText('Grade 2 more');

  await generateAndSave(page, 'X2', 'R2', 3);
  await page.click('#tab-prompt');
  await expect(page.locator('#improve-helper')).toContainText('Grade 1 more');

  await generateAndSave(page, 'X3', 'R3', 5);
  await page.click('#tab-prompt');
  await expect(btn).toBeEnabled();
});

test('Improve flow: opens modal with diff, grades, limits, editable proposal', async ({ page, request }, testInfo) => {
  await generateAndSave(page, 'X1', 'R1', 4);
  await generateAndSave(page, 'X2', 'R2', 3);
  await generateAndSave(page, 'X3', 'R3', 5);

  // Get render ids so we can build a matching consult response
  const slug = projectSlug(testInfo);
  const meta = await (await request.get(`/api/renders/${slug}`)).json();
  const ids = meta.map(r => r.id);

  await page.route('**/api/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(consultResponse(ids)) });
  }, { times: 1 });

  await page.click('#tab-prompt');
  await page.click('#improve-prompt-btn');

  await expect(page.locator('#improvement-modal')).toBeVisible();
  await expect(page.locator('#improve-diff')).toContainText('PROPOSED-PROMPT-V2');
  // Grade comparison renders one row per render plus header
  const rows = page.locator('#improve-grades .grade-row');
  await expect(rows).toHaveCount(4); // header + 3
  await expect(page.locator('#improve-limits')).toContainText('Vague PDL items');
  await expect(page.locator('#improve-proposal')).toHaveValue(/PROPOSED-PROMPT-V2/);
});

test('Save creates a new version; Cancel discards', async ({ page, request }, testInfo) => {
  await generateAndSave(page, 'X1', 'R1', 4);
  await generateAndSave(page, 'X2', 'R2', 3);
  await generateAndSave(page, 'X3', 'R3', 5);

  const slug = projectSlug(testInfo);
  const meta = await (await request.get(`/api/renders/${slug}`)).json();
  const ids = meta.map(r => r.id);

  // Cancel path first
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(consultResponse(ids)) });
  }, { times: 1 });
  await page.click('#tab-prompt');
  const initialOptions = await page.locator('#prompt-version-select option').count();
  await page.click('#improve-prompt-btn');
  await expect(page.locator('#improvement-modal')).toBeVisible();
  await page.click('#improvement-modal button:has-text("Cancel")');
  await expect(page.locator('#improvement-modal')).toBeHidden();
  expect(await page.locator('#prompt-version-select option').count()).toBe(initialOptions);

  // Save path — new version created
  await page.route('**/api/generate', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(consultResponse(ids)) });
  }, { times: 1 });
  await page.click('#improve-prompt-btn');
  await expect(page.locator('#improvement-modal')).toBeVisible();
  await page.fill('#improve-proposal', 'EDITED-BEFORE-SAVE');
  await page.click('#improvement-modal button:has-text("Save as new version")');
  await expect(page.locator('#improvement-modal')).toBeHidden();
  expect(await page.locator('#prompt-version-select option').count()).toBe(initialOptions + 1);
  await expect(page.locator('#prompt-text')).toHaveValue('EDITED-BEFORE-SAVE');

  // Clean up: delete the created prompt version is awkward without a delete endpoint;
  // versions accumulate in prompts.json but other tests don't depend on version count.
});

test('Render carries promptVersionId; History shows version badge', async ({ page, request }, testInfo) => {
  await generateAndSave(page, 'X1', 'R1', 4);
  const slug = projectSlug(testInfo);
  const meta = await (await request.get(`/api/renders/${slug}`)).json();
  expect(meta[0].promptVersionId).toBeTruthy();

  await page.click('#view-history');
  await expect(page.locator('.hist-pv').first()).toContainText(/^v\d+/);
});
