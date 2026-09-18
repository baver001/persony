import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const sha = (process.env.GITHUB_SHA || process.env.GIT_SHA || 'dev').slice(0, 12);
const builtAt = new Date().toISOString();

const content = `/** Generated at build time — do not edit manually. */
export const GIT_SHA = '${sha}';
export const BUILD_TIMESTAMP = '${builtAt}';
`;

writeFileSync(join(process.cwd(), 'worker/lib/build-info.ts'), content);
console.log(`Embedded GIT_SHA=${sha}`);
