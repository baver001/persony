#!/usr/bin/env node
/**
 * Compare Workers AI image models for avatar use (no app wiring).
 * Usage: node scripts/test-workers-ai-image-models.mjs [--model=flux-1-schnell|klein-4b|klein-9b|sdxl-lightning|all]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '9e75a3866eb9269f8d3c3407bdef7cf8';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const OUT_DIR = join(process.cwd(), 'tmp', 'workers-ai-avatar-compare');

const PROMPT =
  'Premium AI messenger portrait, bust framing, simple background, consistent lighting. Character: test companion, calm friendly expression, modest clothing. Square portrait, single person, no text, no watermark.';

const MODELS = {
  'flux-1-schnell': {
    id: '@cf/black-forest-labs/flux-1-schnell',
    kind: 'json',
    body: { prompt: PROMPT, steps: 4 },
    ext: 'jpg',
  },
  'klein-4b': {
    id: '@cf/black-forest-labs/flux-2-klein-4b',
    kind: 'multipart',
    width: 1024,
    height: 1024,
    ext: 'jpg',
  },
  'klein-9b': {
    id: '@cf/black-forest-labs/flux-2-klein-9b',
    kind: 'multipart',
    width: 1024,
    height: 1024,
    ext: 'jpg',
  },
  'sdxl-lightning': {
    id: '@cf/bytedance/stable-diffusion-xl-lightning',
    kind: 'json',
    body: {
      prompt: PROMPT,
      width: 1024,
      height: 1024,
      num_steps: 8,
      guidance: 7.5,
    },
    ext: 'png',
  },
};

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function runModel(key, spec) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${spec.id}`;
  const started = Date.now();
  let res;

  if (spec.kind === 'json') {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(spec.body),
    });
  } else {
    const form = new FormData();
    form.append('prompt', PROMPT);
    form.append('width', String(spec.width));
    form.append('height', String(spec.height));
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: form,
    });
  }

  const latencyMs = Date.now() - started;
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const text = await res.text();
    return { key, ok: false, latencyMs, error: `${res.status} ${text.slice(0, 400)}` };
  }

  if (contentType.includes('application/json')) {
    const json = await res.json();
    const result = json.result ?? json;
    const b64 = result?.image;
    if (!b64 || typeof b64 !== 'string') {
      return { key, ok: false, latencyMs, error: `JSON without image: ${JSON.stringify(result).slice(0, 200)}` };
    }
    const buf = Buffer.from(b64, 'base64');
    const outPath = join(OUT_DIR, `${key}.${spec.ext}`);
    writeFileSync(outPath, buf);
    return { key, ok: true, latencyMs, bytes: buf.length, outPath };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  const outPath = join(OUT_DIR, `${key}.${spec.ext}`);
  writeFileSync(outPath, buf);
  return { key, ok: true, latencyMs, bytes: buf.length, outPath, contentType };
}

async function main() {
  if (!TOKEN) fail('Set CLOUDFLARE_API_TOKEN');

  const arg = process.argv.find((a) => a.startsWith('--model='));
  const pick = arg?.split('=')[1] || 'all';
  const keys = pick === 'all' ? Object.keys(MODELS) : [pick];
  for (const k of keys) {
    if (!MODELS[k]) fail(`Unknown model ${k}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Testing ${keys.join(', ')} → ${OUT_DIR}\n`);

  for (const key of keys) {
    try {
      const r = await runModel(key, MODELS[key]);
      if (r.ok) {
        console.log(`OK  ${key}: ${r.latencyMs}ms, ${r.bytes} bytes → ${r.outPath}`);
      } else {
        console.log(`FAIL ${key}: ${r.error} (${r.latencyMs}ms)`);
      }
    } catch (err) {
      console.log(`FAIL ${key}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

main();
