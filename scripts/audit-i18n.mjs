import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const base = path.join(root, 'src/i18n/locales');

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && !['node_modules', '.git'].includes(ent.name)) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

const files = walk(path.join(root, 'src'));
const usedKeys = new Set();
const re = /\bt\(\s*['"]([^'"]+)['"]/g;
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(s))) usedKeys.add(m[1]);
}

const catalog = {};
for (const lang of ['en', 'ru']) {
  for (const file of fs.readdirSync(path.join(base, lang)).filter((f) => f.endsWith('.json'))) {
    const ns = file.replace('.json', '');
    const data = flatten(JSON.parse(fs.readFileSync(path.join(base, lang, file), 'utf8')));
    for (const [k, v] of Object.entries(data)) {
      catalog[`${ns}:${k}`] = catalog[`${ns}:${k}`] || {};
      catalog[`${ns}:${k}`][lang] = v;
    }
  }
}

const missing = [...usedKeys].filter((k) => !catalog[k]).sort();
console.log('Missing keys:', missing.length);
missing.forEach((k) => console.log('  ', k));

const mixedRu = [];
for (const [key, vals] of Object.entries(catalog)) {
  const ru = vals.ru;
  if (typeof ru !== 'string') continue;
  const hasCyr = /[а-яА-ЯёЁ]/.test(ru);
  const hasLatinWord = /\b[A-Za-z]{4,}\b/.test(ru);
  if (hasLatinWord && !hasCyr) mixedRu.push({ key, ru });
}
console.log('\nRU without cyrillic but with latin words:', mixedRu.length);
mixedRu.forEach((x) => console.log('  ', x.key, '=', JSON.stringify(x.ru)));

const enInRuLabels = [];
const patterns = [
  /\bTagline\b/i,
  /\bSystem Prompt\b/i,
  /\bDiscover\b/,
  /\bSimulation\b/i,
  /симуляц/i,
  /\bPersonaSpec\b/,
];
for (const [key, vals] of Object.entries(catalog)) {
  const ru = vals.ru;
  if (typeof ru !== 'string') continue;
  for (const p of patterns) {
    if (p.test(ru)) enInRuLabels.push({ key, ru, pattern: String(p) });
  }
}
console.log('\nRU quality flags:', enInRuLabels.length);
enInRuLabels.forEach((x) => console.log('  ', x.key, '=', JSON.stringify(x.ru)));
