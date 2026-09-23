import type { Page } from '@playwright/test';
import { createClerkClient } from '@clerk/backend';

export async function createClerkSignInTicket(userId: string): Promise<string> {
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is required for authenticated E2E');
  }
  const clerk = createClerkClient({ secretKey });
  const sit = await clerk.signInTokens.createSignInToken({
    userId: userId.replace(/^clerk:/, ''),
    expiresInSeconds: 300,
  });
  if (!sit?.token) throw new Error('Clerk signInToken empty');
  return sit.token;
}

async function exchangeTicketInBrowser(page: Page, ticket: string) {
  await page.waitForFunction(() => Boolean(window.Clerk?.client), { timeout: 60_000 });

  const result = await page.evaluate(async (token) => {
    try {
      const clerk = window.Clerk;
      if (!clerk?.client) return { ok: false, error: 'clerk client missing' };
      let signIn = await clerk.client.signIn.create({ strategy: 'ticket', ticket: token });
      if (signIn.status !== 'complete') {
        signIn = await signIn.attemptFirstFactor({ strategy: 'ticket', ticket: token });
      }
      if (!signIn.createdSessionId) {
        return { ok: false, error: `sign-in status=${signIn.status}` };
      }
      await clerk.setActive({ session: signIn.createdSessionId });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }, ticket);

  if (!result?.ok) {
    throw new Error(`Clerk ticket auth failed: ${result?.error || 'unknown'}`);
  }
}

export async function signInWithClerkTicket(
  page: Page,
  baseUrl: string,
  ticket: string,
  landingPath = '/'
) {
  const root = baseUrl.replace(/\/$/, '');
  const path = landingPath.startsWith('/') ? landingPath : `/${landingPath}`;
  const ticketUrl = `${root}${path}?__clerk_ticket=${encodeURIComponent(ticket)}`;

  await page.goto(ticketUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 45_000 }).catch(() => {});

  // SPA does not auto-consume __clerk_ticket — exchange explicitly, then strip query.
  await exchangeTicketInBrowser(page, ticket);
  await page.goto(`${root}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForFunction(() => Boolean(window.Clerk?.session?.id), { timeout: 30_000 });
}
