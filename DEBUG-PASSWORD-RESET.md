# Password Reset Debug Guide

## Current Issue

`supabase.auth.exchangeCodeForSession()` is timing out after 10 seconds. The code is present in the URL, which means:
- ✅ Email was sent
- ✅ User clicked the link
- ✅ Redirect URL is whitelisted (otherwise no code would be in URL)
- ❌ Code exchange is hanging

## Debug Steps

### 1. Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Request a new password reset
4. Click the reset link
5. Look for a POST request to:
   ```
   https://ivcsxedmkuyutfvudyfl.supabase.co/auth/v1/token
   ```

### Expected Outcomes:

#### Scenario A: Request NOT in Network Tab
- **Problem**: Request isn't being made
- **Possible Cause**: Supabase client not initialized or CORS issue
- **Solution**: Check console for Supabase client errors

#### Scenario B: Request Shows "CORS Error"
- **Problem**: CORS policy blocking the request
- **Possible Cause**: Supabase project settings
- **Solution**: Check Supabase Dashboard → Project Settings → API → CORS Allowed Origins

#### Scenario C: Request Shows "Pending" Forever
- **Problem**: Request hangs without response
- **Possible Cause**: Network connectivity, firewall, or Supabase server issue
- **Solution**: Try from different network, check Supabase status

#### Scenario D: Request Shows "400 Bad Request"
- **Problem**: Invalid code or code expired
- **Possible Cause**: Code was already used or expired
- **Solution**: Request a new password reset email

#### Scenario E: Request Shows "401 Unauthorized"
- **Problem**: Authentication issue
- **Possible Cause**: Invalid Supabase anon key
- **Solution**: Check environment variables

### 2. Check Supabase Environment Variables

Verify these are set in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://ivcsxedmkuyutfvudyfl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-anon-key]
```

**To verify**:
1. Stop the dev server
2. Run: `echo $NEXT_PUBLIC_SUPABASE_URL` (Mac/Linux) or `echo %NEXT_PUBLIC_SUPABASE_URL%` (Windows)
3. If empty, environment variables aren't loaded
4. Restart dev server

### 3. Check Supabase Redirect URL Configuration

Go to: https://supabase.com/dashboard/project/ivcsxedmkuyutfvudyfl/auth/url-configuration

**Verify these URLs are in "Redirect URLs" list:**
- `http://localhost:3000/auth/reset-password`
- `http://localhost:3001/auth/reset-password`
- `https://myguests.info/auth/reset-password`
- `https://www.myguests.info/auth/reset-password`

### 4. Check for Code Expiry

Password reset codes expire. Try:
1. Request a NEW password reset email
2. Click the link IMMEDIATELY (within 1 minute)
3. Check if it works

If it works when clicked immediately, the code is expiring too quickly.

### 5. Check Supabase Project Status

Go to: https://status.supabase.com/

Verify there are no ongoing incidents affecting auth services.

## Quick Test

Run this in the browser console when on the reset password page:

```javascript
// Check Supabase configuration
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Has anon key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Check if code is in URL
const params = new URLSearchParams(window.location.search)
console.log('Code in URL:', params.get('code'))

// Check Supabase client
const { createClient } = await import('./lib/supabase')
const supabase = createClient()
console.log('Supabase client:', supabase)

// Try manual exchange (replace CODE with actual code from URL)
const code = params.get('code')
if (code) {
  console.log('Attempting manual exchange...')
  const result = await supabase.auth.exchangeCodeForSession(code)
  console.log('Result:', result)
}
```

## Common Fixes

### Fix 1: Environment Variables Not Loaded

1. Create `.env.local` if it doesn't exist
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://ivcsxedmkuyutfvudyfl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[your-key]
   ```
3. Restart dev server

### Fix 2: Redirect URL Not Whitelisted

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add: `http://localhost:3000/auth/reset-password`
3. Save
4. Request new password reset email
5. Click new link

### Fix 3: Code Expired

1. Increase code expiry in Supabase:
   - Dashboard → Authentication → Email Auth
   - Set "Expiry Duration" to longer time (e.g., 1 hour)
2. Request new password reset

### Fix 4: Network/Firewall Issue

1. Try from different network
2. Disable VPN if using one
3. Check browser extensions blocking requests
4. Try in incognito mode

## What to Report

After checking the above, report:
1. What you see in Network tab (screenshot if possible)
2. Any console errors
3. Result of the "Quick Test" script
4. Whether .env.local exists and has correct values

