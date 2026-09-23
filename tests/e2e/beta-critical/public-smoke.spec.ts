import { test, expect } from '@playwright/test';

test.describe('Beta critical — public smoke', () => {
  test('health endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status === 'ok' || body.ok === true).toBeTruthy();
  });

  test('app shell loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Persony/i);
    await expect(page.locator('#root')).toBeAttached();
  });

  test('discover page loads without crash', async ({ page }) => {
    await page.goto('/discover');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
