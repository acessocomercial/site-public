import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

const sharedConfig = {
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch,
  target: ['es2020'],
  format: 'iife',
  charset: 'utf8',
};

const loaderConfig = {
  ...sharedConfig,
  entryPoints: ['src/loader.ts'],
  outfile: 'dist/loader.js',
  globalName: '__acLoader',
};

const toolsConfig = {
  ...sharedConfig,
  entryPoints: ['src/tools.ts'],
  outfile: 'dist/tools.js',
  globalName: '__acTools',
};

if (isWatch) {
  const [loaderCtx, toolsCtx] = await Promise.all([
    context(loaderConfig),
    context(toolsConfig),
  ]);
  await Promise.all([loaderCtx.watch(), toolsCtx.watch()]);
  console.log('[storefront-tools] watching for changes...');
} else {
  await Promise.all([build(loaderConfig), build(toolsConfig)]);
  console.log('[storefront-tools] build complete');
}
