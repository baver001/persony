import { test, expect } from '@playwright/test';

test.describe('Beta critical — My Personas shell', () => {
  test('my-personas page loads without crash', async ({ page }) => {
    await page.goto('/my-personas');
    await expect(page.locator('body')).toBeVisible();
  });
});
