// Guards that run before any Firestore or Anthropic call (no emulator needed): node test.mjs after npm run build.
import assert from 'node:assert/strict'

process.env.GCLOUD_PROJECT ??= 'demo-test'
const { readDrawing } = await import('./lib/index.js')

async function rejects(req, code) {
  try {
    await readDrawing.run(req)
  } catch (e) {
    assert.equal(e.code, code, `expected ${code}, got ${e.code}: ${e.message}`)
    return
  }
  assert.fail(`expected ${code}`)
}

await rejects({ data: { data: 'x'.repeat(100), mediaType: 'image/png', model: 'claude-opus-5-5' } }, 'unauthenticated')
const auth = { uid: 'u1', token: {} }
await rejects({ auth, data: { data: 'x'.repeat(100), mediaType: 'image/tiff', model: 'claude-opus-5-5' } }, 'invalid-argument')
await rejects({ auth, data: { data: 'x'.repeat(100), mediaType: 'image/png', model: 'gpt-x' } }, 'invalid-argument')
await rejects({ auth, data: { data: 'short', mediaType: 'image/png', model: 'claude-opus-5-5' } }, 'invalid-argument')
await rejects({ auth, data: { data: 'x'.repeat(100), mediaType: 'image/png', model: 'claude-opus-5-5', hint: 'h'.repeat(3000) } }, 'invalid-argument')
// signed in but without an email: no FormWork profile to check → refused before any Firestore read
await rejects({ auth, data: { data: 'x'.repeat(100), mediaType: 'image/png', model: 'claude-opus-5-5' } }, 'permission-denied')
console.log('functions guards ok')
