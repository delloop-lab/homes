import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('\n📝 Setting Redirect URLs via API\n')
console.log('Note: This uses the Management API which may require admin access.\n')

// The redirect URLs we want to add
const redirectUrls = [
  'http://localhost:3000/auth/reset-password',
  'http://localhost:3001/auth/reset-password'
]

console.log('Attempting to set redirect URLs:')
redirectUrls.forEach(url => console.log(`  - ${url}`))
console.log('\n⚠️  Note: Supabase Management API may not support setting redirect URLs directly.')
console.log('You may need to set this in the dashboard.\n')

// Try to use the Management API
// Note: Supabase doesn't expose redirect URL settings via the standard client
// This would need to be done through the Supabase Dashboard or their Management API
// which requires special authentication

console.log('❌ Unfortunately, Supabase redirect URLs must be set in the dashboard.')
console.log('The Management API does not expose this setting.\n')
console.log('Please try the direct link:')
console.log('https://supabase.com/dashboard/project/ivcsxedmkuyutfvudyfl/auth/url-configuration\n')
console.log('Or navigate manually:')
console.log('1. Go to Supabase Dashboard')
console.log('2. Select your project')
console.log('3. Click "Authentication" in sidebar')
console.log('4. Look for "URL Configuration" or "Settings"')
console.log('5. Add the redirect URLs listed above\n')



