#!/usr/bin/env node
/**
 * Print Clerk user id for first OWNER role in remote D1 (for SMOKE_OWNER_CLERK_USER_ID).
 *
 *   npm run smoke:economics:discover-owner-id
 */
import { execSync } from 'node:child_process';

function d1Query(sql) {
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  const cmd = `npx wrangler d1 execute persony-db --remote --command "${oneLine.replace(/"/g, '\\"')}" --json`;
  const out = execSync(cmd, { encoding: 'utf8', cwd: process.cwd(), shell: true });
  const parsed = JSON.parse(out);
  const block = Array.isArray(parsed) ? parsed[0] : parsed;
  return block?.results ?? [];
}

const rows = d1Query(
  `SELECT u.auth_provider_id AS clerk_user_id
   FROM users u
   INNER JOIN user_roles r ON r.user_id = u.id AND r.role = 'OWNER'
   LIMIT 1`
);

if (!rows[0]?.clerk_user_id) {
  console.error('FAIL no OWNER user in remote D1 (check PERSONY_OWNER_CLERK_IDS bootstrap)');
  process.exit(1);
}

const clerkUserId = String(rows[0].clerk_user_id).replace(/^clerk:/, '');
if (process.argv.includes('--print-only')) {
  process.stdout.write(clerkUserId);
  process.exit(0);
}
console.log(`OK owner_clerk_user_id=${clerkUserId}`);
console.log(`export SMOKE_OWNER_CLERK_USER_ID=${clerkUserId}`);
