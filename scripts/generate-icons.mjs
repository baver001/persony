import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'icon.svg'));

const outputs = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['apple-touch-icon.png', 180],
  ['icon-192.png', 192],
  ['icon-512.png', 512],
];

for (const [name, size] of outputs) {
  await sharp(svg).resize(size, size).png().toFile(join(root, 'public', name));
  console.log(`wrote public/${name} (${size}px)`);
}

await sharp(svg).resize(32, 32).png().toFile(join(root, 'public', 'favicon.ico'));
console.log('wrote public/favicon.ico');
