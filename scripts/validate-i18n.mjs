import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const localesDir = join(process.cwd(), 'src', 'i18n', 'locales');
let failed = false;

for (const lang of readdirSync(localesDir, { withFileTypes: true })) {
  if (!lang.isDirectory()) continue;
  const langPath = join(localesDir, lang.name);
  for (const file of readdirSync(langPath)) {
    if (!file.endsWith('.json')) continue;
    const filePath = join(langPath, file);
    try {
      JSON.parse(readFileSync(filePath, 'utf8'));
    } catch (error) {
      failed = true;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Invalid i18n JSON: ${filePath} — ${message}`);
    }
  }
}

if (failed) {
  process.exit(1);
}

console.log('i18n locale JSON files are valid');
