import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8')
  const env = {}
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) env[t.slice(0, i)] = t.slice(i + 1)
  }
  return env
}

async function findUserByEmail(admin, email) {
  let page = 1
  const perPage = 200
  while (true) {
    const { data, error } = await admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    const users = data?.users || []
    const hit = users.find(u => (u.email || '').toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (users.length < perPage) return null
    page += 1
  }
}

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3] || 'TempPass123!'
  if (!email) {
    console.error('Usage: node scripts/fix-user.mjs <email> [newPassword]')
    process.exit(1)
  }

  const env = loadEnv()
  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  const anonKey = (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  if (!url || !serviceKey || !anonKey) {
    console.error('Missing env keys. Check .env.local')
    process.exit(1)
  }

  const adminClient = createClient(url, serviceKey)
  const publicClient = createClient(url, anonKey)

  // Locate user
  const user = await findUserByEmail(adminClient.auth.admin, email)
  if (!user) {
    console.log(JSON.stringify({ ok: false, reason: 'user_not_found', email }, null, 2))
    process.exit(2)
  }

  // Confirm and set password
  const { data: updated, error: updErr } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword,
    email_confirm: true
  })
  if (updErr) {
    console.log(JSON.stringify({ ok: false, reason: 'update_failed', error: updErr.message }, null, 2))
    process.exit(2)
  }

  // Try sign-in
  const { data: signInData, error: signInErr } = await publicClient.auth.signInWithPassword({
    email,
    password: newPassword
  })
  console.log(JSON.stringify({
    ok: !signInErr,
    step: 'sign_in',
    error: signInErr ? signInErr.message : null,
    session: !!signInData?.session
  }, null, 2))
}

main().catch(err => {
  console.error('FAIL:', err.message)
  process.exit(1)
})










