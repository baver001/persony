import { test, expect, type Page } from '@playwright/test';
import { createClerkSignInTicket, signInWithClerkTicket } from './fixtures/clerk-ticket-auth';

async function dismissBlockingModals(page: Page) {
  const importLater = page.getByRole('button', { name: /later|позже/i });
  if (await importLater.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await importLater.click({ force: true });
  }
  const pwaDismiss = page.getByRole('button', { name: /^dismiss$/i });
  if (await pwaDismiss.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await pwaDismiss.click({ force: true }).catch(() => undefined);
  }
}

const baseURL = process.env.PERSONY_E2E_BASE_URL ?? 'https://beta.persony.org';
const e2eEnabled = process.env.PERSONY_E2E_CLERK_AUTH === '1';
const e2eUserId =
  process.env.PERSONY_E2E_CLERK_USER_ID?.trim() ||
  process.env.SMOKE_OWNER_CLERK_USER_ID?.trim();

test.describe('Beta critical — persona lifecycle', () => {
  test.describe.configure({ timeout: 180_000 });

  test.skip(
    !e2eEnabled || !e2eUserId || !process.env.CLERK_SECRET_KEY,
    'set PERSONY_E2E_CLERK_AUTH=1 + PERSONY_E2E_CLERK_USER_ID (or SMOKE_OWNER_CLERK_USER_ID) + CLERK_SECRET_KEY'
  );

  test.beforeEach(async ({ page }) => {
    const ticket = await createClerkSignInTicket(e2eUserId!);
    await signInWithClerkTicket(page, baseURL, ticket, '/my-personas');
  });

  test('signed-in user can open My Personas', async ({ page }) => {
    await page.goto('/my-personas');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /create|создать/i })).toBeVisible();
  });

  test('signed-in user loads personas from API', async ({ page }) => {
    await page.goto('/my-personas');
    const mineResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/personas/mine') &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: 60_000 }
    );
    const body = (await mineResponse.json()) as { personas?: unknown[] };
    if ((body.personas?.length ?? 0) > 0) {
      await expect(page.locator('article').first()).toBeVisible();
    } else {
      await expect(page.getByText(/have not created any personas|ещё не создали/i)).toBeVisible();
    }
  });

  test('create → save → delete persona', async ({ page }) => {
    const personaName = `E2E Beta ${Date.now()}`;

    await page.goto('/my-personas');
    await page.waitForResponse(
      (response) =>
        response.url().includes('/api/personas/mine') &&
        response.request().method() === 'GET',
      { timeout: 60_000 }
    );
    await dismissBlockingModals(page);
    await page.getByRole('button', { name: /create|создать/i }).first().click();

    const modal = page.locator('#create-persona-backdrop');
    await expect(modal.getByRole('heading', { level: 2 })).toBeVisible();
    await modal.locator('input[type="text"]').first().fill(personaName);
    const [createResponse] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/personas') && response.request().method() === 'POST'
      ),
      modal.locator('#save-persona-btn').click(),
    ]);
    expect(createResponse.ok()).toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 60_000 });

    // Save redirects to chat — delete via profile drawer (works before My Personas auth-gate deploy).
    await expect(page.getByRole('heading', { level: 2, name: personaName })).toBeVisible({
      timeout: 30_000,
    });
    await dismissBlockingModals(page);
    await page.getByRole('button', { name: /persona info|о персоне/i }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /delete persona|удалить персонажа/i }).click();

    await expect(page.getByRole('heading', { level: 2, name: personaName })).toHaveCount(0, {
      timeout: 30_000,
    });
  });
});
