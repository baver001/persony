import { test, expect } from '@playwright/test';

test.describe('Beta critical — auth entry', () => {
  test('anonymous user sees sign-in in profile menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const profileButton = page.getByRole('button', { name: /profile|профиль/i });
    await expect(profileButton).toBeVisible();
    await profileButton.click();

    await expect(page.getByRole('button', { name: /sign in|войти/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|регистрация/i })).toBeVisible();
  });
});
