const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function build() {
  fs.mkdirSync('dist/renderer', { recursive: true });

  // 0. Build Tailwind
  console.log("Building Tailwind CSS...");
  const tailwindBin = path.join(__dirname, '../node_modules/.bin/tailwindcss');
  execSync(`${tailwindBin} -i ./src/renderer/tailwind.css -o ./dist/renderer/tailwind.css`);

  // 1. Build Renderer (React)
  await esbuild.build({
    entryPoints: ['src/renderer/App.tsx'],
    bundle: true,
    outfile: 'dist/renderer/bundle.js',
    platform: 'browser',
    sourcemap: true,
    minify: process.env.NODE_ENV === 'production',
    loader: { '.js': 'jsx', '.ts': 'tsx', '.tsx': 'tsx' },
    define: { 'process.env.NODE_ENV': `"${process.env.NODE_ENV || 'development'}"` }
  });

  // 2. Build Preload
  await esbuild.build({
    entryPoints: ['src/preload.ts'],
    bundle: true,
    outfile: 'dist/preload.js',
    platform: 'node',
    external: ['electron']
  });

  // 3. Copy HTML
  const htmlContent = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WaveVault</title>
    <link rel="stylesheet" href="tailwind.css">
    <link rel="stylesheet" href="bundle.css">
  </head>
  <body>
    <div id="root"></div>
    <script src="bundle.js"></script>
  </body>
</html>
    `;
  // Note: CSS is bundled by esbuild if imported in App.tsx (which it is), 
  // esbuild will output bundle.css alongside bundle.js automatically if configured or if simple imports usage.
  // Actually, allowing simple css import:
  // We need to verify if esbuild naturally emits css file if we import css. Yes, it does if output file checks out.
  // But let's make sure we copy index.html if we had a custom one, or write this one.

  // Let's modify the build step to support CSS loader seamlessly or just read the CSS file.
  // The previous App.tsx imports './App.css'. Esbuild handles this default.

  fs.mkdirSync('dist/renderer', { recursive: true });
  fs.writeFileSync('dist/renderer/index.html', htmlContent);
  if (fs.existsSync('wavevault-white.svg')) {
    fs.copyFileSync('wavevault-white.svg', 'dist/renderer/wavevault-white.svg');
    fs.copyFileSync('wavevault-white.svg', 'dist/wavevault-white.svg');
  }
  if (fs.existsSync('wavevault.svg')) {
    fs.copyFileSync('wavevault.svg', 'dist/renderer/wavevault.svg');
    fs.copyFileSync('wavevault.svg', 'dist/wavevault.svg');
  }
}


build().catch(() => process.exit(1));
