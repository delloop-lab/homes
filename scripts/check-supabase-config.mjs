import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

console.log('\n🔍 Supabase Configuration Check\n')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...')

console.log('\n⚠️  IMPORTANT: Redirect URL Configuration\n')
console.log('You MUST add these URLs to your Supabase dashboard:')
console.log('  1. Go to: Supabase Dashboard → Authentication → URL Configuration')
console.log('  2. Add these to "Redirect URLs":')
console.log('     - http://localhost:3000/auth/reset-password')
console.log('     - http://localhost:3001/auth/reset-password')
console.log('     - https://yourdomain.com/auth/reset-password (for production)')
console.log('  3. Make sure "Site URL" is set to: http://localhost:3000')
console.log('\n❌ If the redirect URL is NOT whitelisted, password reset will fail!')
console.log('   Supabase will not include the code/token in the redirect.\n')

// Test if we can create a client
try {
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  console.log('✅ Supabase client created successfully')
  console.log('\n📝 Next Steps:')
  console.log('  1. Verify redirect URLs in Supabase dashboard')
  console.log('  2. Request a new password reset email')
  console.log('  3. Check browser console (F12) when clicking the reset link')
  console.log('  4. Look for "Password reset validation:" logs\n')
} catch (error) {
  console.error('❌ Failed to create Supabase client:', error.message)
}



