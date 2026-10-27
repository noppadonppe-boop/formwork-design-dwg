// Bundles the functions (and the prompt/schema shared with the web app in ../src/import/aiSchedule.ts) into lib/.
// firebase-functions and firebase-admin stay external: Cloud Build installs them from package.json.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: ['firebase-functions', 'firebase-functions/*', 'firebase-admin', 'firebase-admin/*'],
  // ESM output still has to load CommonJS deps that call require()
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
})
