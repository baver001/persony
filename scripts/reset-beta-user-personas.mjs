#!/usr/bin/env node
/**
 * One-time beta persona reset for a single user (dry-run by default).
 *
 * Does NOT delete users, roles, owner settings, or official personas.
 *
 * Usage:
 *   node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_xxx [--remote]
 *   node scripts/reset-beta-user-personas.mjs --user-id=<internal_uuid> [--remote]
 *   node scripts/reset-beta-user-personas.mjs --clerk-user-id=user_xxx --execute --confirm [--remote]
 */
import { execSync } from 'node:child_process';

const SYSTEM_OWNER = 'system';

function parseArgs(argv) {
  const out = {
    clerkUserId: null,
    userId: null,
    remote: true,
    execute: false,
    confirm: false,
  };

  for (const arg of argv) {
    if (arg === '--execute') out.execute = true;
    else if (arg === '--confirm') out.confirm = true;
    else if (arg === '--local') out.remote = false;
    else if (arg === '--remote') out.remote = true;
    else if (arg.startsWith('--clerk-user-id=')) out.clerkUserId = arg.slice('--clerk-user-id='.length);
    else if (arg.startsWith('--user-id=')) out.userId = arg.slice('--user-id='.length);
  }

  return out;
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}

function d1Query(sql, remote) {
  const target = remote ? '--remote' : '--local';
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  const cmd = `npx wrangler d1 execute persony-db ${target} --command "${oneLine.replace(/"/g, '\\"')}" --json`;
  const out = execSync(cmd, { encoding: 'utf8', cwd: process.cwd(), shell: true });
  const parsed = JSON.parse(out);
  const block = Array.isArray(parsed) ? parsed[0] : parsed;
  return block?.results ?? [];
}

function d1Run(sql, remote) {
  const target = remote ? '--remote' : '--local';
  const oneLine = sql.replace(/\s+/g, ' ').trim();
  const cmd = `npx wrangler d1 execute persony-db ${target} --command "${oneLine.replace(/"/g, '\\"')}"`;
  execSync(cmd, { encoding: 'utf8', cwd: process.cwd(), stdio: 'inherit', shell: true });
}

function sqlInList(ids) {
  return ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(', ');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.clerkUserId && !args.userId) {
    fail('Provide --clerk-user-id=<id> or --user-id=<internal id>');
  }

  if (args.execute && !args.confirm) {
    fail('--execute requires explicit --confirm');
  }

  const mode = args.execute ? 'EXECUTE' : 'DRY-RUN';
  const dbTarget = args.remote ? 'remote' : 'local';
  console.log(`reset-beta-user-personas mode=${mode} db=${dbTarget}`);

  let internalUserId = args.userId;
  if (!internalUserId && args.clerkUserId) {
    const bareClerkId = args.clerkUserId.replace(/^clerk:/, '');
    const canonicalClerkId = bareClerkId.startsWith('user_') ? `clerk:${bareClerkId}` : bareClerkId;
    const escapedBare = bareClerkId.replace(/'/g, "''");
    const escapedCanonical = canonicalClerkId.replace(/'/g, "''");
    const rows = d1Query(
      `SELECT id FROM users WHERE auth_provider_id IN ('${escapedBare}', '${escapedCanonical}') LIMIT 1`,
      args.remote
    );
    if (!rows[0]?.id) {
      fail(`No users row for clerk id ${bareClerkId} (tried bare and clerk: prefix)`);
    }
    internalUserId = String(rows[0].id);
  }

  console.log(`target_user_id=${internalUserId}`);

  if (internalUserId === SYSTEM_OWNER) {
    fail('Refusing to reset system owner personas');
  }

  const customPersonas = d1Query(
    `SELECT id FROM personas WHERE owner_user_id = '${internalUserId.replace(/'/g, "''")}'`,
    args.remote
  );
  const personaIds = customPersonas.map((row) => String(row.id));

  if (personaIds.length === 0) {
    console.log('OK no user-created personas to reset');
    process.exit(0);
  }

  const inPersonas = sqlInList(personaIds);

  const counts = {
    personas: personaIds.length,
    persona_versions: d1Query(
      `SELECT COUNT(*) AS c FROM persona_versions WHERE persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
    user_personas: d1Query(
      `SELECT COUNT(*) AS c FROM user_personas WHERE user_id = '${internalUserId.replace(/'/g, "''")}' AND persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
    conversation_personas: d1Query(
      `SELECT COUNT(*) AS c FROM conversation_personas WHERE persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
    conversations: d1Query(
      `SELECT COUNT(DISTINCT c.id) AS c FROM conversations c
       INNER JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.owner_user_id = '${internalUserId.replace(/'/g, "''")}' AND cp.persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
    messages: d1Query(
      `SELECT COUNT(*) AS c FROM messages m
       INNER JOIN conversations c ON c.id = m.conversation_id
       INNER JOIN conversation_personas cp ON cp.conversation_id = c.id
       WHERE c.owner_user_id = '${internalUserId.replace(/'/g, "''")}' AND cp.persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
    memories: d1Query(
      `SELECT COUNT(*) AS c FROM memories WHERE user_id = '${internalUserId.replace(/'/g, "''")}' AND persona_id IN (${inPersonas})`,
      args.remote
    )[0]?.c ?? 0,
  };

  console.log('affected_counts', JSON.stringify(counts, null, 2));
  console.log('persona_ids', personaIds.join(', '));

  if (!args.execute) {
    console.log('\nDRY-RUN complete. Re-run with --execute --confirm to apply.');
    console.log('Recommended: create a D1 backup/snapshot before execute.');
    process.exit(0);
  }

  console.log('\nEXECUTE starting…');

  d1Run(
    `DELETE FROM messages WHERE conversation_id IN (
      SELECT DISTINCT c.id FROM conversations c
      INNER JOIN conversation_personas cp ON cp.conversation_id = c.id
      WHERE c.owner_user_id = '${internalUserId.replace(/'/g, "''")}' AND cp.persona_id IN (${inPersonas})
    )`,
    args.remote
  );

  d1Run(
    `DELETE FROM conversation_personas WHERE persona_id IN (${inPersonas})`,
    args.remote
  );

  d1Run(
    `DELETE FROM conversations WHERE id IN (
      SELECT DISTINCT c.id FROM conversations c
      LEFT JOIN conversation_personas cp ON cp.conversation_id = c.id
      WHERE c.owner_user_id = '${internalUserId.replace(/'/g, "''")}' AND cp.conversation_id IS NULL
    ) AND owner_user_id = '${internalUserId.replace(/'/g, "''")}'`,
    args.remote
  );

  d1Run(
    `DELETE FROM memories WHERE user_id = '${internalUserId.replace(/'/g, "''")}' AND persona_id IN (${inPersonas})`,
    args.remote
  );

  d1Run(
    `DELETE FROM user_personas WHERE user_id = '${internalUserId.replace(/'/g, "''")}' AND persona_id IN (${inPersonas})`,
    args.remote
  );

  d1Run(`DELETE FROM persona_versions WHERE persona_id IN (${inPersonas})`, args.remote);
  d1Run(
    `DELETE FROM personas WHERE owner_user_id = '${internalUserId.replace(/'/g, "''")}' AND id IN (${inPersonas})`,
    args.remote
  );

  console.log('OK reset complete');
  console.log(`audit: user=${internalUserId} deleted_personas=${personaIds.length} at=${new Date().toISOString()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
