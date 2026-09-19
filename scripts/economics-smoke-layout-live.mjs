#!/usr/bin/env node
/**
 * Authenticated Owner Console layout smoke (390px + 1440px) on production beta.
 *
 * Requires: CLERK_SECRET_KEY, playwright + chromium
 *   npm install
 *   npx playwright install chromium
 *   npm run smoke:economics:layout-live
 */
import { createOwnerSignInTicket, signInOwnerWithTicket } from './economics-smoke-clerk-page-auth.mjs';

const BASE = (process.env.SMOKE_BASE_URL || 'https://beta.persony.org').replace(/\/$/, '');
const TARGET_INFERENCE = process.env.SMOKE_TARGET_INFERENCE_ID || 'e2ac39dc-e6e6-4bd0-88bd-684609912f98';

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

async function launchBrowser(chromium) {
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch {
      // try next channel
    }
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    fail(
      `playwright browser unavailable (${err?.message || err}). Install: npx playwright install chromium`
    );
  }
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    fail('playwright not installed. Run: npm install');
  }
}

async function waitOwnerShell(page) {
  const blocked = await page
    .waitForFunction(
      () => {
        const text = document.body?.innerText || '';
        if (/Sign in required|Access denied|Server error/i.test(text)) return 'blocked';
        if (/Войдите|Доступ запрещён|Ошибка сервера/i.test(text)) return 'blocked';
        if (document.querySelector('aside.hidden.lg\\:block, nav.lg\\:hidden.fixed.bottom-0')) {
          return 'ready';
        }
        return null;
      },
      { timeout: 60_000 }
    )
    .then((h) => h.jsonValue())
    .catch(() => 'timeout');

  if (blocked === 'blocked') {
    const snippet = await page.locator('body').innerText();
    fail(
      `owner shell blocked (${snippet.slice(0, 80)}). Deploy /api/me fix (a7eb29f+) if Access denied.`
    );
  }
  if (blocked !== 'ready') fail('owner shell timeout — Clerk session or deploy not ready');
}

async function clickNav(page, pattern) {
  const btn = page.getByRole('button', { name: pattern }).first();
  await btn.waitFor({ state: 'visible', timeout: 15_000 });
  await btn.click();
}

async function assertVisible(locator, label) {
  const visible = await locator.isVisible();
  if (!visible) fail(`${label} not visible`);
  ok(label);
}

async function assertHidden(locator, label) {
  const visible = await locator.isVisible();
  if (visible) fail(`${label} should be hidden`);
  ok(label);
}

async function checkMobile(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  if (!page.url().includes('/owner')) {
    await page.goto(`${BASE}/owner`, { waitUntil: 'domcontentloaded' });
  }
  await waitOwnerShell(page);

  const mobileNav = page.locator('nav.lg\\:hidden.fixed.bottom-0');
  await assertVisible(mobileNav, 'layout_390_mobile_bottom_nav');
  const navButtons = mobileNav.locator('button');
  const count = await navButtons.count();
  if (count !== 5) fail(`layout_390_bottom_nav_buttons expected 5 got ${count}`);
  ok('layout_390_bottom_nav_five_tiles');

  await clickNav(page, /Inference|Инференс/i);
  await assertVisible(page.locator('ul.md\\:hidden'), 'layout_390_inference_card_list');
  await assertHidden(page.locator('div.hidden.md\\:block table'), 'layout_390_inference_table_hidden');

  const targetCard = page.locator('ul.md\\:hidden button').filter({ hasText: TARGET_INFERENCE.slice(0, 8) });
  if (await targetCard.count()) {
    await targetCard.first().click();
    const body = await page.locator('body').innerText();
    if (!/immutable/i.test(body)) fail('layout_390_target_inference_missing_immutable_badge');
    ok(`layout_390_target_inference_immutable=${TARGET_INFERENCE.slice(0, 8)}`);
  } else {
    const firstCard = page.locator('ul.md\\:hidden button').first();
    if (await firstCard.count()) {
      await firstCard.click();
      ok('layout_390_inference_detail_opened');
    }
  }

  await clickNav(page, /More|Ещё/i);
  await assertVisible(page.getByRole('button', { name: /Pricing|Тарифы/i }), 'layout_390_more_pricing');
  await page.keyboard.press('Escape');
  await page.locator('div.lg\\:hidden.fixed.inset-0').click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});

  await clickNav(page, /Economy|Экономика/i);
  await assertVisible(page.locator('.grid.grid-cols-2').first(), 'layout_390_economy_metric_cards');

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  if (scrollWidth > clientWidth + 2) {
    fail(`layout_390_horizontal_scroll scrollWidth=${scrollWidth} clientWidth=${clientWidth}`);
  }
  ok('layout_390_no_horizontal_scroll');
}

async function checkDesktop(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await waitOwnerShell(page);

  await assertVisible(page.locator('aside.hidden.lg\\:block'), 'layout_1440_desktop_sidebar');
  await assertHidden(page.locator('nav.lg\\:hidden.fixed.bottom-0'), 'layout_1440_mobile_nav_hidden');

  await clickNav(page, /Inference|Инференс/i);
  await assertVisible(page.locator('div.hidden.md\\:block table'), 'layout_1440_inference_table');
  const headers = await page.locator('div.hidden.md\\:block table th').allTextContents();
  const headerText = headers.join(' ').toLowerCase();
  if (!/cogs|себестоимость|cost/i.test(headerText)) {
    fail(`layout_1440_inference_table_headers missing COGS: ${headers.join(',')}`);
  }
  ok('layout_1440_inference_table_headers');

  await page.locator('label').filter({ hasText: /confidence|уверенность/i }).locator('select').selectOption('unpriced');
  await page.waitForTimeout(1500);
  const tableText = await page.locator('div.hidden.md\\:block table tbody').innerText();
  if (tableText.includes('$0.00') && !tableText.includes('—')) {
    fail('layout_1440_unpriced_cogs_shows_zero_instead_of_dash');
  }
  if (!tableText.includes('—') && !tableText.includes('unpriced')) {
    ok('layout_1440_unpriced_filter_no_rows_or_dash');
  } else {
    ok('layout_1440_unpriced_cogs_em_dash');
  }

  await clickNav(page, /Users|Пользователи/i);
  await assertVisible(page.locator('div.hidden.md\\:block table').first(), 'layout_1440_users_table');
}

async function main() {
  const { chromium } = await loadPlaywright();
  const ticket = await createOwnerSignInTicket();

  const browser = await launchBrowser(chromium);
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(90_000);

  try {
    await signInOwnerWithTicket(page, BASE, ticket);
    ok('clerk_ticket_sign_in');

    await checkMobile(page);
    await checkDesktop(page);

    console.log('\nAuthenticated layout smoke passed (390px + 1440px).');
    console.log('Record in docs/GOAL_MODE_STATE.md manual verification table.');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
