import { test, expect } from '@playwright/test';

test.describe('Beta critical — billing hidden', () => {
  test('settings page does not expose billing for anonymous users', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/billing|оплата|paddle/i)).toHaveCount(0);
  });
});
