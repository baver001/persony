import { test, expect } from '@playwright/test';
import { createClerkSignInTicket, signInWithClerkTicket } from './fixtures/clerk-ticket-auth';

const baseURL = process.env.PERSONY_E2E_BASE_URL ?? 'https://beta.persony.org';
const e2eEnabled = process.env.PERSONY_E2E_CLERK_AUTH === '1';
const e2eUserId =
  process.env.PERSONY_E2E_CLERK_USER_ID?.trim() ||
  process.env.SMOKE_OWNER_CLERK_USER_ID?.trim();

/** Official roster slug — safe to install/uninstall for E2E. */
const DISCOVER_INSTALL_SLUG = 'elsa';

test.describe('Beta critical — Discover install', () => {
  test.describe.configure({ timeout: 120_000 });

  test.skip(
    !e2eEnabled || !e2eUserId || !process.env.CLERK_SECRET_KEY,
    'set PERSONY_E2E_CLERK_AUTH=1 + PERSONY_E2E_CLERK_USER_ID (or SMOKE_OWNER_CLERK_USER_ID) + CLERK_SECRET_KEY'
  );

  test.beforeEach(async ({ page }) => {
    const ticket = await createClerkSignInTicket(e2eUserId!);
    await signInWithClerkTicket(page, baseURL, ticket, '/discover');
    await page.request.delete(`${baseURL}/api/me/personas/${DISCOVER_INSTALL_SLUG}`);
  });

  test.afterEach(async ({ page }) => {
    await page.request.delete(`${baseURL}/api/me/personas/${DISCOVER_INSTALL_SLUG}`);
  });

  test('signed-in user installs gallery persona and opens chat', async ({ page }) => {
    await page.goto('/discover');
    await page.waitForResponse(
      (response) => response.url().includes('/api/personas') && response.request().method() === 'GET',
      { timeout: 60_000 }
    );

    const card = page.getByRole('article').filter({ hasText: /elsa/i });
    await expect(card).toBeVisible();
    const startButton = card.getByRole('button', { name: /^start chat|начать чат/i });
    await expect(startButton).toBeVisible();

    const [installResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/me/personas/${DISCOVER_INSTALL_SLUG}/install`) &&
          response.request().method() === 'POST'
      ),
      startButton.click(),
    ]);
    expect(installResponse.ok()).toBeTruthy();

    await expect(page.getByRole('heading', { level: 2, name: /elsa/i })).toBeVisible({
      timeout: 30_000,
    });
  });
});
