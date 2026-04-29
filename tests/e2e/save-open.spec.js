const { test, expect } = require('@playwright/test');

function projectSlug(testInfo) {
  return `e2e_save_${testInfo.testId}`;
}

test.afterEach(async ({ request }, testInfo) => {
  await request.delete(`/api/projects/${projectSlug(testInfo)}`);
});

test('Save → reload → Open round-trip restores project state', async ({ page }, testInfo) => {
  const name = projectSlug(testInfo);

  await page.goto('/');
  await page.fill('#project-name', name);
  await page.fill('#project-desc', 'roundtrip desc');

  await page.selectOption('#new-category', 'flow');
  await page.fill('#new-text', 'Sign up flow');
  await page.locator('#panel-decisions button', { hasText: '+' }).first().click();

  await page.click('#save-project-btn');
  await expect(page.locator('#toast')).toHaveText('Saved');

  // Reload restores from localStorage (dirty against unknown server state).
  // Clicking New triggers the dirty-confirm; accept it.
  await page.reload();
  page.once('dialog', d => d.accept());
  await page.click('button:has-text("New")');

  await expect(page.locator('#project-name')).toHaveValue('');
  await expect(page.locator('#decision-list')).toContainText('No decisions yet');

  // Open the saved project
  await page.click('#open-project-btn');
  await page.locator(`#open-project-menu button[data-slug="${name}"]`).click();

  await expect(page.locator('#project-name')).toHaveValue(name);
  await expect(page.locator('#project-desc')).toHaveValue('roundtrip desc');
  await expect(page.locator('#decision-list')).toContainText('Sign up flow');
});

test('Save with empty name shows validation toast', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("New")');
  await page.click('#save-project-btn');
  await expect(page.locator('#toast')).toHaveText('Name a project before saving');
});
