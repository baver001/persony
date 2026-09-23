import { test, expect } from '@playwright/test';

test('rooms route is not exposed in beta', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const roomsLink = page.getByRole('button', { name: /rooms/i });
  await expect(roomsLink).toHaveCount(0);

  await page.goto('/rooms');
  await expect(page).toHaveURL(/\//);
});
