/* global console, process */
import { build } from 'esbuild';

async function runBuild() {
  try {
    await build({
      entryPoints: ['src/app.ts'],
      bundle: true,
      minify: true,
      platform: 'node',
      format: 'esm',
      outdir: 'dist',
      target: 'node24',
      alias: {
        '@core': './src/core',
        '@infra': './src/infrastructure',
        '@shared': './src/shared',
      },
      packages: 'external',
    });
    console.info('🚀 Build exitoso en /dist');
  } catch (error) {
    console.error('❌ Error durante el build:', error);
    process.exit(1);
  }
}

runBuild();
