// Multi-project access rules (firestore.rules + storage.rules), run against the emulators: npm run test:rules
import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const ROOT = 'RC-FormWork-Design-Web-App/root'
let env: RulesTestEnvironment

interface Who {
  uid: string
  email: string
  roles: string[]
  status?: string
  assignedProjects?: string[]
}
const people = {
  master: { uid: 'master', email: 'master@x.com', roles: ['MasterAdmin'] },
  admin: { uid: 'admin', email: 'admin@x.com', roles: ['Admin'], assignedProjects: ['p1'] },
  eng: { uid: 'eng', email: 'eng@x.com', roles: ['Engineer'], assignedProjects: ['p1'] },
  chk: { uid: 'chk', email: 'chk@x.com', roles: ['Checker'], assignedProjects: ['p1'] },
  est: { uid: 'est', email: 'est@x.com', roles: ['Estimator'], assignedProjects: ['p1'] },
  staff: { uid: 'staff', email: 'staff@x.com', roles: ['Staff'] },
  pend: { uid: 'pend', email: 'pend@x.com', roles: ['Engineer'], status: 'pending', assignedProjects: ['p1'] },
} satisfies Record<string, Who>

const as = (w: Who) => env.authenticatedContext(w.uid, { email: w.email, email_verified: true })
const db = (w: Who) => as(w).firestore()
const project = (members: string[], extra: object = {}) => ({ projectNo: 'P-1', name: 'Tower', ownerUid: 'eng', members, elementCount: 1, createdAt: 1, updatedAt: 1, version: 1, ...extra })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-formwork',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const fs = ctx.firestore()
    for (const w of Object.values(people) as Who[])
      await fs.doc(`${ROOT}/users/${w.email}`).set({ ...w, role: w.roles[0], status: w.status ?? 'approved', assignedProjects: w.assignedProjects ?? [], isFirstUser: false, version: 1 })
    await fs.doc(`${ROOT}/appMeta/config`).set({ firstUserRegistered: true, totalUsers: 7 })
    await fs.doc(`${ROOT}/projects/p1`).set(project(['admin', 'eng', 'chk', 'est', 'pend']))
    await fs.doc(`${ROOT}/projects/p2`).set(project(['someone-else'], { projectNo: 'P-2', ownerUid: 'someone-else' }))
    await fs.doc(`${ROOT}/projects/p1/elements/e1`).set({ projectId: 'p1', code: 'W1' })
    await fs.doc(`${ROOT}/projectNumbers/n_p-1`).set({ projectId: 'p1', projectNo: 'P-1' })
    await ctx.storage().ref(`${ROOT}/projects/p1/attachments/f1-a.pdf`).put(new Uint8Array([1, 2, 3]), { customMetadata: { uploadedBy: 'eng' } })
  })
})

describe('project isolation', () => {
  it('members read their project and its elements', async () => {
    await assertSucceeds(db(people.eng).doc(`${ROOT}/projects/p1`).get())
    await assertSucceeds(db(people.eng).collection(`${ROOT}/projects/p1/elements`).get())
  })
  it('non-members, pending users and accounts without a profile are refused', async () => {
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p2`).get())
    await assertFails(db(people.staff).doc(`${ROOT}/projects/p1`).get())
    await assertFails(db(people.staff).collection(`${ROOT}/projects/p1/elements`).get())
    await assertFails(db(people.pend).doc(`${ROOT}/projects/p1`).get())
    const outsider = env.authenticatedContext('other-app', { email: 'someone@other-app.com', email_verified: true }).firestore()
    await assertFails(outsider.doc(`${ROOT}/projects/p1`).get())
    await assertFails(env.unauthenticatedContext().firestore().doc(`${ROOT}/projects/p1`).get())
  })
  it('lists only with a members query; MasterAdmin lists everything', async () => {
    await assertSucceeds(db(people.eng).collection(`${ROOT}/projects`).where('members', 'array-contains', 'eng').get())
    await assertFails(db(people.eng).collection(`${ROOT}/projects`).get())
    await assertSucceeds(db(people.master).collection(`${ROOT}/projects`).get())
    await assertSucceeds(db(people.master).doc(`${ROOT}/projects/p2`).get())
    await assertSucceeds(db(people.master).doc(`${ROOT}/projects/deleted`).get())
  })
})

describe('user profiles', () => {
  it('users cannot raise their own roles, status or projects', async () => {
    const me = db(people.eng).doc(`${ROOT}/users/eng@x.com`)
    await assertFails(me.update({ roles: ['MasterAdmin'], role: 'MasterAdmin' }))
    await assertFails(db(people.pend).doc(`${ROOT}/users/pend@x.com`).update({ status: 'approved' }))
    await assertFails(me.update({ assignedProjects: ['p1', 'p2'] }))
    await assertSucceeds(me.update({ firstName: 'Somchai', version: 2 }))
  })
  it('profiles are private; MasterAdmin manages everyone', async () => {
    await assertSucceeds(db(people.pend).doc(`${ROOT}/users/pend@x.com`).get())
    await assertFails(db(people.eng).doc(`${ROOT}/users/chk@x.com`).get())
    await assertFails(db(people.eng).collection(`${ROOT}/users`).get())
    await assertSucceeds(db(people.master).collection(`${ROOT}/users`).get())
    await assertSucceeds(db(people.master).doc(`${ROOT}/users/staff@x.com`).update({ assignedProjects: ['p1'] }))
  })
  it('a new account registers only as pending Staff', async () => {
    const newbie = { uid: 'new', email: 'new@x.com' }
    const fs = env.authenticatedContext(newbie.uid, { email: newbie.email }).firestore()
    const base = { uid: 'new', email: 'new@x.com', firstName: 'N', lastName: '', assignedProjects: [], version: 1 }
    await assertFails(fs.doc(`${ROOT}/users/new@x.com`).set({ ...base, roles: ['MasterAdmin'], role: 'MasterAdmin', status: 'approved', isFirstUser: true }))
    await assertFails(fs.doc(`${ROOT}/users/someone@x.com`).set({ ...base, email: 'someone@x.com', roles: ['Staff'], role: 'Staff', status: 'pending', isFirstUser: false }))
    await assertSucceeds(fs.doc(`${ROOT}/users/new@x.com`).set({ ...base, roles: ['Staff'], role: 'Staff', status: 'pending', isFirstUser: false }))
  })
  it('the very first user becomes MasterAdmin together with appMeta/config (createUserProfile)', async () => {
    await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(`${ROOT}/appMeta/config`).delete())
    const fs = env.authenticatedContext('first', { email: 'first@x.com' }).firestore()
    const profile = { uid: 'first', email: 'first@x.com', roles: ['MasterAdmin'], role: 'MasterAdmin', status: 'approved', isFirstUser: true, assignedProjects: [], version: 1 }
    await assertFails(fs.doc(`${ROOT}/users/first@x.com`).set(profile))
    await assertSucceeds(
      fs.runTransaction(async (tx) => {
        await tx.get(fs.doc(`${ROOT}/users/first@x.com`))
        await tx.get(fs.doc(`${ROOT}/appMeta/config`))
        tx.set(fs.doc(`${ROOT}/users/first@x.com`), profile)
        tx.set(fs.doc(`${ROOT}/appMeta/config`), { firstUserRegistered: true, totalUsers: 1 })
      }),
    )
  })
})

describe('writes follow roles', () => {
  it('Checker edits project details but not members or BOM settings', async () => {
    const p = db(people.chk).doc(`${ROOT}/projects/p1`)
    await assertSucceeds(p.update({ name: 'Tower B', version: 2, updatedAt: 2 }))
    await assertFails(p.update({ members: ['chk', 'staff'] }))
    await assertFails(p.update({ shop: { company: 'x' } }))
  })
  it('Estimator edits only BOM settings', async () => {
    const p = db(people.est).doc(`${ROOT}/projects/p1`)
    await assertSucceeds(p.update({ shop: { company: 'x' }, version: 2, updatedAt: 2 }))
    await assertFails(p.update({ name: 'Hacked' }))
    await assertFails(db(people.est).doc(`${ROOT}/projects/p1/elements/e2`).set({ projectId: 'p1', code: 'W2' }))
  })
  it('Engineer designs elements in own projects only, and cannot delete a project', async () => {
    await assertSucceeds(db(people.eng).doc(`${ROOT}/projects/p1/elements/e2`).set({ projectId: 'p1', code: 'W2' }))
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p2/elements/e2`).set({ projectId: 'p2', code: 'W2' }))
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p1`).delete())
    await assertSucceeds(db(people.admin).doc(`${ROOT}/projects/p1`).delete())
  })
  it('panel stock: members read it, Engineers edit it in their own projects only', async () => {
    await assertSucceeds(db(people.eng).doc(`${ROOT}/projects/p1/panels/k1`).set({ projectId: 'p1', code: 'P-2412' }))
    await assertSucceeds(db(people.chk).collection(`${ROOT}/projects/p1/panels`).get())
    await assertFails(db(people.est).doc(`${ROOT}/projects/p1/panels/k2`).set({ projectId: 'p1', code: 'P-2012' }))
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p2/panels/k2`).set({ projectId: 'p2', code: 'P-2012' }))
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p1/panels/k3`).set({ projectId: 'p2', code: 'P-2012' }))
    await assertFails(db(people.staff).collection(`${ROOT}/projects/p1/panels`).get())
    await assertSucceeds(db(people.eng).doc(`${ROOT}/projects/p1/assemblies/a1`).set({ projectId: 'p1', code: 'ASM-F1' }))
    await assertFails(db(people.est).doc(`${ROOT}/projects/p1/assemblies/a2`).set({ projectId: 'p1', code: 'ASM-F2' }))
    await assertFails(db(people.eng).doc(`${ROOT}/projects/p1/other/x1`).set({ projectId: 'p1' }))
  })
  it('adding an element bumps the project counter in the same batch (repo.createElement)', async () => {
    const fs = db(people.eng)
    const batch = fs.batch()
    batch.set(fs.doc(`${ROOT}/projects/p1/elements/e3`), { projectId: 'p1', code: 'W3' })
    batch.update(fs.doc(`${ROOT}/projects/p1`), { elementCount: 2, updatedAt: 3 })
    await assertSucceeds(batch.commit())
  })
  it('MasterAdmin saves an assignment list holding a deleted project (updateUserAdmin)', async () => {
    const fs = db(people.master)
    await assertSucceeds(
      fs.runTransaction(async (tx) => {
        await tx.get(fs.doc(`${ROOT}/users/staff@x.com`))
        await tx.get(fs.doc(`${ROOT}/projects/gone`))
        await tx.get(fs.doc(`${ROOT}/projects/p2`))
        tx.update(fs.doc(`${ROOT}/projects/p2`), { members: ['someone-else', 'staff'] })
        tx.update(fs.doc(`${ROOT}/users/staff@x.com`), { assignedProjects: ['p2'], version: 2 })
      }),
    )
  })
  it('a creator assigns themself only the project they are creating', async () => {
    const fs = db(people.eng)
    await assertSucceeds(
      fs.runTransaction(async (tx) => {
        tx.set(fs.doc(`${ROOT}/projects/p3`), project(['eng'], { projectNo: 'P-3', elementCount: 0 }))
        tx.set(fs.doc(`${ROOT}/projectNumbers/n_p-3`), { projectId: 'p3', projectNo: 'P-3' })
        tx.update(fs.doc(`${ROOT}/users/eng@x.com`), { assignedProjects: ['p1', 'p3'], version: 2 })
      }),
    )
    await assertFails(fs.doc(`${ROOT}/users/eng@x.com`).update({ assignedProjects: ['p1', 'p3', 'p2'], version: 3 }))
    await assertFails(fs.doc(`${ROOT}/projects/p4`).set(project(['eng', 'staff'], { projectNo: 'P-4', elementCount: 0 })))
    await assertFails(db(people.chk).doc(`${ROOT}/projects/p4`).set(project(['chk'], { projectNo: 'P-4', ownerUid: 'chk', elementCount: 0 })))
  })
})

describe('storage', () => {
  const path = `${ROOT}/projects/p1/attachments/f1-a.pdf`
  it('only project members read files', async () => {
    await assertSucceeds(as(people.est).storage().ref(path).getMetadata())
    await assertFails(as(people.staff).storage().ref(path).getMetadata())
  })
  it('uploads are tagged with the uploader; only they or a manager delete', async () => {
    const own = `${ROOT}/projects/p1/attachments/f2-b.pdf`
    await assertFails(as(people.chk).storage().ref(own).put(new Uint8Array([1]), { customMetadata: { uploadedBy: 'eng' } }))
    await assertSucceeds(as(people.chk).storage().ref(own).put(new Uint8Array([1]), { customMetadata: { uploadedBy: 'chk' } }))
    await assertFails(as(people.chk).storage().ref(path).delete())
    await assertSucceeds(as(people.admin).storage().ref(path).delete())
    await assertFails(as(people.staff).storage().ref(`${ROOT}/projects/p1/attachments/x.pdf`).put(new Uint8Array([1]), { customMetadata: { uploadedBy: 'staff' } }))
  })
})
