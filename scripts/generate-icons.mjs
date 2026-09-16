import sharp from 'sharp';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(root, 'public/brand');
const publicDir = join(root, 'public');

const sources = {
  markDarkUi: join(root, 'src/assets/persony-icon-light.svg'),
  markLightUi: join(root, 'src/assets/persony-icon-dark.svg'),
  markDarkUiPng: join(root, 'src/assets/persony-icon-dark.png'),
  markLightUiPng: join(root, 'src/assets/persony-icon-light.png'),
};

const APP_BG = '#0a0a0b';

mkdirSync(brandDir, { recursive: true });

for (const filePath of Object.values(sources)) {
  copyFileSync(filePath, join(brandDir, basename(filePath)));
}

function extractSvgGraphic(svgText) {
  const pathMatch = svgText.match(/<path[^>]*\/>/);
  const circleMatch = svgText.match(/<circle[^>]*\/>/);
  if (!pathMatch || !circleMatch) {
    throw new Error('Expected path and circle in brand SVG');
  }
  return `${pathMatch[0]}\n    ${circleMatch[0]}`;
}

function buildSquareAppIconSvg(markSvgPath) {
  const graphic = extractSvgGraphic(readFileSync(markSvgPath, 'utf8'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Persony">
  <rect width="32" height="32" rx="7" fill="${APP_BG}"/>
  <svg x="3.5" y="2" width="25" height="28" viewBox="0 0 120.564 140.437" overflow="visible">
    ${graphic}
  </svg>
</svg>
`;
}

const appIconSvg = buildSquareAppIconSvg(sources.markDarkUi);
writeFileSync(join(publicDir, 'icon.svg'), appIconSvg);
writeFileSync(join(publicDir, 'favicon.svg'), appIconSvg);
writeFileSync(join(brandDir, 'persony-app-icon.svg'), appIconSvg);
console.log('wrote public/icon.svg, public/favicon.svg');

async function renderSquarePng(svgInput, size, paddingRatio = 0) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const pad = Math.round((size - inner) / 2);
  const resized = await sharp(svgInput)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 10, g: 10, b: 11, alpha: 1 },
    })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 10, g: 10, b: 11, alpha: 1 },
    },
  })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toBuffer();
}

const appIconSvgBuffer = Buffer.from(appIconSvg);

const rasterOutputs = [
  ['favicon-16x16.png', 16, 0.08],
  ['favicon-32x32.png', 32, 0.08],
  ['apple-touch-icon.png', 180, 0.06],
  ['icon-192.png', 192, 0.06],
  ['icon-512.png', 512, 0.06],
  ['icon-maskable-512.png', 512, 0.18],
];

for (const [name, size, padding] of rasterOutputs) {
  const buf = await renderSquarePng(appIconSvgBuffer, size, padding);
  await sharp(buf).toFile(join(publicDir, name));
  console.log(`wrote public/${name} (${size}px)`);
}

const faviconBuf = await renderSquarePng(appIconSvgBuffer, 32, 0.08);
await sharp(faviconBuf).toFile(join(publicDir, 'favicon.ico'));
console.log('wrote public/favicon.ico');

const ogIcon = await renderSquarePng(appIconSvgBuffer, 420, 0.06);
await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 10, g: 10, b: 11, alpha: 1 },
  },
})
  .composite([{ input: ogIcon, gravity: 'center' }])
  .png()
  .toFile(join(publicDir, 'og-image.png'));
console.log('wrote public/og-image.png');
