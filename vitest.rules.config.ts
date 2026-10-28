// Security-rules tests (tests/rules) — need the Firestore and Storage emulators: npm run test:rules
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], environment: 'node', testTimeout: 30_000, hookTimeout: 60_000, fileParallelism: false },
})
