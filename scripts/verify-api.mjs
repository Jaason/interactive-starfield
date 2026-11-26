import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, [fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url)), 'run', 'tests/api.test.js'], { stdio: 'inherit' });
