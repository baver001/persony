#!/usr/bin/env node
/**
 * Official persona avatar generation helper (Beta RC §19–24).
 *
 *   node scripts/generate-official-avatars.mjs
 *   node scripts/generate-official-avatars.mjs --execute
 *   node scripts/generate-official-avatars.mjs --execute --slug=athena
 *   npx tsx scripts/generate-official-avatars.mjs --execute --via-workers-ai --slug=athena
 *   node scripts/generate-official-avatars.mjs --execute --via-api
 *   node scripts/generate-official-avatars.mjs --apply-roster --confirm
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GoogleGenAI, Modality } from '@google/genai';
import { createClerkClient } from '@clerk/backend';
import sharp from 'sharp';
import { buildOfficialAvatarPrompt } from '../shared/personas/official-avatar-prompt.ts';
import { OFFICIAL_PERSONA_ROSTER } from '../shared/personas/official-roster.ts';

const MODEL = 'gemini-3.1-flash-image';
const WORKERS_AI_MODEL = '@cf/black-forest-labs/flux-1-schnell';

const LEGACY_HINTS = {
  viktor: 'pragmatic software engineer, focused, subtle tech aesthetic',
  marc_nova: 'startup strategist, confident, approachable business leader',
  sofia: 'reflective companion, gentle empathy, soft natural light',
  elsa: 'adult storyteller, calm creative expression, clear studio portrait, modest clothing',
  chef_marco: 'warm culinary companion, inviting smile, kitchen ambiance bokeh',
};

const ROSTER = OFFICIAL_PERSONA_ROSTER.map((persona) => ({
  slug: persona.id,
  name: persona.name,
  spec: persona.spec,
  fallbackArtDirection: LEGACY_HINTS[persona.id],
}));

function buildPrompt(entry) {
  return buildOfficialAvatarPrompt({
    name: entry.name,
    slug: entry.slug,
    spec: entry.spec,
    fallbackArtDirection: entry.fallbackArtDirection,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withQuotaRetry(label, fn, { attempts = 3, baseDelayMs = 45_000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const retryable =
        /429|quota|rate limit|RESOURCE_EXHAUSTED|API 500|перегружен|overloaded|temporarily unavailable/i.test(
          message
        );
      if (!retryable || attempt === attempts) throw err;
      const overload = /API 500|перегружен|overloaded/i.test(message);
      const waitMs = (overload ? 15_000 : baseDelayMs) * attempt;
      console.warn(
        `${label}: ${overload ? 'model overload' : 'quota/rate limit'} (attempt ${attempt}/${attempts}), retry in ${Math.round(waitMs / 1000)}s…`
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function parseArgs(argv) {
  const slugArg = argv.find((a) => a.startsWith('--slug='));
  return {
    execute: argv.includes('--execute'),
    applyRoster: argv.includes('--apply-roster'),
    confirm: argv.includes('--confirm'),
    slug: slugArg?.split('=')[1]?.trim() || null,
    viaApi: argv.includes('--via-api'),
    viaWorkersAi: argv.includes('--via-workers-ai'),
    apiBase: argv.find((a) => a.startsWith('--api-base='))?.split('=')[1] ?? 'https://beta.persony.org',
  };
}

function loadDevVars() {
  const devVarsPath = join(process.cwd(), '.dev.vars');
  if (!existsSync(devVarsPath)) return;
  for (const line of readFileSync(devVarsPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveClerkUserId() {
  const raw =
    process.env.PERSONY_E2E_CLERK_USER_ID?.trim() ||
    process.env.SMOKE_OWNER_CLERK_USER_ID?.trim() ||
    process.argv.find((a) => a.startsWith('--clerk-user-id='))?.split('=')[1]?.trim();
  return raw?.replace(/^clerk:/, '') || null;
}

async function mintClerkJwt() {
  loadDevVars();
  const secretKey = process.env.CLERK_SECRET_KEY?.trim();
  const userId = resolveClerkUserId();
  if (!secretKey) throw new Error('CLERK_SECRET_KEY not set (.dev.vars or env)');
  if (!userId) {
    throw new Error('Set PERSONY_E2E_CLERK_USER_ID, SMOKE_OWNER_CLERK_USER_ID, or --clerk-user-id=');
  }

  const clerk = createClerkClient({ secretKey });
  const sessions = await clerk.sessions.getSessionList({ userId, status: 'active', limit: 10 });
  const list = sessions.data ?? [];
  let session = list.sort((a, b) => {
    const aTs = Date.parse(a.lastActiveAt ?? a.updatedAt ?? a.createdAt ?? 0);
    const bTs = Date.parse(b.lastActiveAt ?? b.updatedAt ?? b.createdAt ?? 0);
    return bTs - aTs;
  })[0];

  if (!session) {
    session = await clerk.sessions.createSession({ userId });
  }

  const token = await clerk.sessions.getToken(session.id);
  const jwt = typeof token === 'string' ? token : token?.jwt;
  if (!jwt) throw new Error('Clerk getToken returned empty jwt');
  return jwt;
}

function loadGeminiApiKey() {
  if (process.env.GEMINI_API_KEY?.trim()) return process.env.GEMINI_API_KEY.trim();
  const devVarsPath = join(process.cwd(), '.dev.vars');
  if (!existsSync(devVarsPath)) return null;
  for (const line of readFileSync(devVarsPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === 'GEMINI_API_KEY' && value) return value;
  }
  return null;
}

async function generatePortrait(apiKey, entry) {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = [
    'Create a single square portrait avatar for a fictional AI companion in a messenger app.',
    `Character name: ${entry.name}.`,
    `Creative direction: ${buildPrompt(entry)}`,
    'Centered face or bust, clean simple background, polished digital art, friendly and readable at small size.',
    'No text, no watermark, no collage, no multiple people.',
  ].join(' ');

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const data = part.inlineData?.data;
    if (data) {
      return Buffer.from(data, 'base64');
    }
  }
  throw new Error(`No image returned for ${entry.slug}`);
}

async function generatePortraitViaApi(apiBase, bearer, entry) {
  const root = apiBase.replace(/\/$/, '');
  const res = await fetch(`${root}/api/generate-avatar`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      prompt: buildPrompt(entry),
      personaName: entry.name,
      personaId: entry.slug,
      clientRequestId: `official_${entry.slug}_${Date.now()}`,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error || body?.message || body?.error_code || res.statusText;
    let message = `API ${res.status}: ${detail}`;
    if (res.status === 429) {
      message +=
        '\nEnable paid quota for gemini-3.1-flash-image on the Google project used by Worker GEMINI_API_KEY (see docs/BETA_RC_PROGRESS.md BLOCKER-1).';
    }
    throw new Error(message);
  }

  const dataUrl = body?.imageDataUrl;
  if (!dataUrl || !dataUrl.startsWith('data:')) {
    throw new Error(`No imageDataUrl for ${entry.slug}`);
  }

  const base64 = dataUrl.split(',')[1];
  if (!base64) throw new Error(`Invalid imageDataUrl for ${entry.slug}`);
  return Buffer.from(base64, 'base64');
}

async function generatePortraitViaWorkersAi(prompt) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '9e75a3866eb9269f8d3c3407bdef7cf8';
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN not set');

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${WORKERS_AI_MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, steps: 4 }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Workers AI ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  const b64 = body?.result?.image ?? body?.image;
  if (!b64 || typeof b64 !== 'string') {
    throw new Error('Workers AI returned no image');
  }
  return Buffer.from(b64, 'base64');
}

async function saveWebp(buffer, outPath, { previewDir, slug } = {}) {
  const webp = await sharp(buffer)
    .resize(1024, 1024, { fit: 'cover', position: 'attention' })
    .sharpen({ sigma: 0.6 })
    .webp({ quality: 84 })
    .toBuffer();
  writeFileSync(outPath, webp);

  if (previewDir && slug) {
    mkdirSync(previewDir, { recursive: true });
    for (const size of [36, 64]) {
      const thumb = await sharp(webp).resize(size, size, { fit: 'cover' }).png().toBuffer();
      writeFileSync(join(previewDir, `${slug}-${size}px.png`), thumb);
    }
  }
}

function applyRosterPaths() {
  const rosterPath = join(process.cwd(), 'shared', 'personas', 'official-roster.ts');
  let source = readFileSync(rosterPath, 'utf8');
  const outDir = join(process.cwd(), 'public', 'personas', 'official');
  for (const entry of ROSTER) {
    const webpPath = join(outDir, `${entry.slug}.webp`);
    if (!existsSync(webpPath)) {
      throw new Error(`Missing ${webpPath} — generate all portraits before --apply-roster`);
    }
  }

  const keyMap = {
    athena: 'athena',
    viktor: 'viktor',
    marc_nova: 'marcNova',
    sofia: 'sofia',
    elsa: 'elsa',
    chef_marco: 'chefMarco',
  };

  const lines = ROSTER.map((entry) => {
    const key = keyMap[entry.slug];
    return `  ${key}: '/personas/official/${entry.slug}.webp',`;
  });

  source = source.replace(
    /const AVATARS = \{[\s\S]*?\} as const;/,
    `const AVATARS = {\n${lines.join('\n')}\n} as const;`
  );
  writeFileSync(rosterPath, source, 'utf8');
  console.log(`Updated ${rosterPath} with local WebP paths.`);
}

async function main() {
  loadDevVars();
  const args = parseArgs(process.argv.slice(2));
  const outDir = join(process.cwd(), 'public', 'personas', 'official');
  mkdirSync(outDir, { recursive: true });

  const roster = args.slug ? ROSTER.filter((e) => e.slug === args.slug) : ROSTER;
  if (args.slug && roster.length === 0) {
    throw new Error(`Unknown slug: ${args.slug}`);
  }

  if (args.applyRoster) {
    if (!args.confirm) {
      console.error('Pass --confirm to replace Unsplash URLs in official-roster.ts');
      process.exit(1);
    }
    applyRosterPaths();
    return;
  }

  const viaLabel = args.viaWorkersAi
    ? 'workers-ai-flux-schnell'
    : args.viaApi
      ? 'worker-api'
      : 'gemini-direct';
  console.log(`mode=${args.execute ? 'EXECUTE' : 'DRY-RUN'} via=${viaLabel} apiBase=${args.apiBase}`);
  for (const entry of roster) {
    const prompt = buildPrompt(entry);
    const manifestPath = join(outDir, `${entry.slug}.prompt.txt`);
    writeFileSync(manifestPath, prompt, 'utf8');
    console.log(`\n[${entry.slug}]\n${prompt}\n→ ${manifestPath}`);
  }

  if (!args.execute) {
    console.log('\nDRY-RUN complete. Review prompts, then:');
    console.log('  node scripts/generate-official-avatars.mjs --execute');
    console.log('  node scripts/generate-official-avatars.mjs --execute --via-api  # uses Worker GEMINI key');
    console.log('After visual approval:');
    console.log('  node scripts/generate-official-avatars.mjs --apply-roster --confirm');
    process.exit(0);
  }

  const apiKey = args.viaApi || args.viaWorkersAi ? null : loadGeminiApiKey();
  if (!args.viaApi && !args.viaWorkersAi && !apiKey) {
    console.error('GEMINI_API_KEY not found — use --via-workers-ai, --via-api, or set GEMINI_API_KEY');
    process.exit(1);
  }
  if (args.viaApi) {
    await mintClerkJwt();
  }

  const previewDir = join(process.cwd(), 'public', 'personas', 'official', '_previews');

  for (const entry of roster) {
    const outPath = join(outDir, `${entry.slug}.webp`);
    const prompt = buildPrompt(entry);
    const via = args.viaWorkersAi
      ? WORKERS_AI_MODEL
      : args.viaApi
        ? `Worker API (${args.apiBase})`
        : MODEL;
    console.log(`\nGenerating ${entry.slug} via ${via}…`);
    const buffer = await withQuotaRetry(entry.slug, async () => {
      if (args.viaWorkersAi) {
        return generatePortraitViaWorkersAi(prompt);
      }
      if (args.viaApi) {
        const bearer = await mintClerkJwt();
        return generatePortraitViaApi(args.apiBase, bearer, entry);
      }
      return generatePortrait(apiKey, entry);
    });
    await saveWebp(buffer, outPath, { previewDir, slug: entry.slug });
    console.log(`✓ ${outPath} (${buffer.length} bytes source → webp)`);
    if (previewDir) {
      console.log(`  previews: ${join(previewDir, `${entry.slug}-36px.png`)}`);
    }
  }

  console.log('\nGeneration complete. Visually approve all six, then run --apply-roster --confirm');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
