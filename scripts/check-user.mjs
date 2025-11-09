import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function parseEnvLocal(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const lines = raw.split(/\r?\n/)
  const env = {}
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

async function main() {
  const email = process.argv[2] || ''
  const envPath = resolve(process.cwd(), '.env.local')
  let env
  try {
    env = parseEnvLocal(envPath)
  } catch (err) {
    console.error('ERROR: Unable to read .env.local:', err.message)
    process.exit(1)
  }

  const url = (env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const serviceKey = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !serviceKey) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
    process.exit(1)
  }

  const supabase = createClient(url, serviceKey)

  try {
    if (email) {
      const { data, error } = await supabase.auth.admin.getUserByEmail(email)
      if (error) {
        console.error('ADMIN_ERR:', error.message)
        process.exit(2)
      }
      if (data?.user) {
        console.log(JSON.stringify({ found: true, id: data.user.id, email: data.user.email, created_at: data.user.created_at }, null, 2))
      } else {
        console.log(JSON.stringify({ found: false, email }, null, 2))
      }
      return
    }

    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) {
      console.error('ADMIN_ERR:', error.message)
      process.exit(2)
    }
    const users = data?.users || []
    console.log(JSON.stringify({ count: users.length, sample: users.slice(0, 10).map(u => ({ id: u.id, email: u.email, created_at: u.created_at })) }, null, 2))
  } catch (err) {
    console.error('ADMIN_ERR:', err.message)
    process.exit(2)
  }
}

main()










