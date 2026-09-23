import { test, expect } from '@playwright/test';

test.describe('Beta critical — Discover / Gallery', () => {
  test('discover page loads filters and gallery shell', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('tab', { name: /all|все/i })).toBeVisible();
  });

});
