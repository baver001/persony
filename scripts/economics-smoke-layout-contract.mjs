#!/usr/bin/env node
/**
 * Static Owner Console layout contract (no auth).
 * Validates nav structure and responsive patterns match PRODUCTION_ECONOMICS_SMOKE.md §15–23.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function assertIncludes(haystack, needle, label) {
  if (!haystack.includes(needle)) fail(`${label}: missing "${needle}"`);
}

function main() {
  const nav = read('src/pages/owner/nav.ts');
  const shell = read('src/pages/owner/OwnerShell.tsx');
  const inference = read('src/pages/owner/sections/OwnerInferenceSection.tsx');
  const economy = read('src/pages/owner/sections/OwnerEconomySection.tsx');
  const users = read('src/pages/owner/sections/OwnerUsersSection.tsx');
  const personas = read('src/pages/owner/sections/OwnerPersonasSection.tsx');
  const pricing = read('src/pages/owner/sections/OwnerPricingSection.tsx');
  const errors = read('src/pages/owner/sections/OwnerErrorsSection.tsx');
  const ai = read('src/pages/owner/sections/OwnerAiSection.tsx');
  const utils = read('src/pages/owner/utils.ts');

  // Mobile bottom nav (§15)
  for (const id of ['overview', 'ai', 'economy', 'inference']) {
    assertIncludes(nav, `'${id}'`, `MOBILE_PRIMARY_SECTIONS.${id}`);
  }
  assertIncludes(shell, "owner:nav.more", 'mobile More label');
  for (const id of ['pricing', 'users', 'personas', 'settings', 'errors']) {
    assertIncludes(nav, `'${id}'`, `MOBILE_MORE_SECTIONS.${id}`);
  }

  // Desktop sidebar groups (§20)
  for (const key of ['nav.overview', 'nav.ai', 'nav.economy', 'nav.people', 'nav.system']) {
    assertIncludes(nav, `'${key}'`, `OWNER_NAV_GROUPS.${key}`);
  }

  // Shell responsive chrome
  assertIncludes(shell, 'hidden lg:block', 'desktop sidebar');
  assertIncludes(shell, 'lg:hidden fixed bottom-0', 'mobile bottom nav');
  assertIncludes(shell, 'min-h-[52px]', 'mobile tap targets ≥44px');
  assertIncludes(shell, 'min-h-[44px]', 'More drawer tap targets');

  // Inference: cards mobile, table desktop (§17, §21)
  assertIncludes(inference, 'md:hidden', 'inference mobile card list');
  assertIncludes(inference, 'hidden md:block', 'inference desktop table');
  assertIncludes(inference, 'inferenceImmutableBadge', 'immutable badge');
  assertIncludes(inference, 'inferenceLegacyBadge', 'legacy badge');
  assertIncludes(inference, 'formatMicrousd(item.providerCostMicrousd)', 'COGS via formatMicrousd');

  // Economy stacked cards (§18)
  assertIncludes(economy, 'grid grid-cols-2', 'economy metric cards grid');

  // Unknown COGS ≠ $0 (§23)
  assertIncludes(utils, "return '—'", 'formatMicrousd null → em dash');

  // Card list + table on all analytics sections (§17, §21–22)
  for (const [name, src] of [
    ['users', users],
    ['personas', personas],
    ['economy', economy],
    ['pricing', pricing],
    ['errors', errors],
    ['ai', ai],
  ]) {
    assertIncludes(src, 'md:hidden', `${name} mobile cards`);
    assertIncludes(src, 'hidden md:block', `${name} desktop table`);
  }

  console.log('OK layout_contract mobile_primary=overview,ai,economy,inference,more');
  console.log('OK layout_contract mobile_more=pricing,users,personas,settings,errors');
  console.log('OK layout_contract inference_cards_md_hidden_table_md_block');
  console.log('OK layout_contract formatMicrousd_unknown_em_dash');

  console.log('\nLayout contract smoke passed (static; manual 390/1440 sign-off still required).');
}

main();
