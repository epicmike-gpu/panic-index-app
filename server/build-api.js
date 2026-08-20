import * as esbuild from 'esbuild';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const dependencies = pkg.dependencies || {};
const externalList = Object.keys(dependencies).filter(dep => dep !== 'dayjs');

try {
  await esbuild.build({
    entryPoints: ['../api/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: '../api/dist/index.js',
    external: externalList,
    tsconfig: './tsconfig.json',
  });
  console.log('⚡ API build complete!');
} catch (e) {
  console.error(e);
  process.exit(1);
}
