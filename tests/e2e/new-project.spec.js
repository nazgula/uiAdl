const { test, expect } = require('@playwright/test');

test('New on a clean workspace does not prompt and clears state', async ({ page }) => {
  await page.goto('/');
  // Start clean: dirty flag clears after a New on no-edits already-clean workspace.
  await page.click('button:has-text("New")');

  page.on('dialog', () => {
    throw new Error('Unexpected confirm() dialog on clean New');
  });

  await page.click('button:has-text("New")');
  await expect(page.locator('#project-name')).toHaveValue('');
});

test('New on a dirty workspace prompts; Cancel keeps state, OK clears', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("New")');

  await page.fill('#project-name', 'dirty-test');
  await page.selectOption('#new-category', 'flow');
  await page.fill('#new-text', 'Dirty decision');
  await page.locator('#panel-decisions button', { hasText: '+' }).first().click();

  // Cancel keeps state
  page.once('dialog', d => d.dismiss());
  await page.click('button:has-text("New")');
  await expect(page.locator('#project-name')).toHaveValue('dirty-test');
  await expect(page.locator('#decision-list')).toContainText('Dirty decision');

  // Accept clears state
  page.once('dialog', d => d.accept());
  await page.click('button:has-text("New")');
  await expect(page.locator('#project-name')).toHaveValue('');
  await expect(page.locator('#decision-list')).toContainText('No decisions yet');
});
