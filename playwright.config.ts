import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

function loadDevVars() {
  try {
    const content = readFileSync(join(process.cwd(), '.dev.vars'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional local secrets for authenticated E2E
  }
}

loadDevVars();

const baseURL = process.env.PERSONY_E2E_BASE_URL ?? 'https://beta.persony.org';
const browserChannel = (process.env.PERSONY_E2E_CHANNEL ??
  (process.platform === 'win32' ? 'msedge' : undefined)) as 'chrome' | 'msedge' | undefined;

export default defineConfig({
  testDir: 'tests/e2e/beta-critical',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(browserChannel ? { channel: browserChannel } : {}),
      },
    },
  ],
});
