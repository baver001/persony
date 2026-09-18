import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const tsc = join(root, 'node_modules', 'typescript', 'lib', 'tsc.js');

if (!existsSync(tsc)) {
  console.error('Зависимости не установлены или node_modules повреждён.\n');
  console.error('1. Остановите dev-сервер (Ctrl+C в терминале с npm run dev)');
  console.error('2. Выполните:\n');
  console.error(`   cd "${root}"`);
  console.error('   Remove-Item -Recurse -Force node_modules');
  console.error('   npm ci');
  console.error('   npm run ci\n');
  process.exit(1);
}
