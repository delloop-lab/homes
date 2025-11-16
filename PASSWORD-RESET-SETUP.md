# Password Reset Setup Guide

## ✅ Code Changes Complete

The password reset page has been updated to handle:
- PKCE flow (newer Supabase auth)
- Token-based flow (older Supabase auth)
- URL hash parameters
- Auth state change events

## ⚙️ Supabase Configuration Required

For password reset to work, you need to configure the redirect URL in your Supabase dashboard:

### Steps:

1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → URL Configuration
   - Or: Project Settings → Authentication → URL Configuration

2. **Add Redirect URLs**
   Add these URLs to the "Redirect URLs" list:
   
   **For Development:**
   ```
   http://localhost:3000/auth/reset-password
   http://localhost:3001/auth/reset-password
   ```
   
   **For Production (replace with your actual domain):**
   ```
   https://yourdomain.com/auth/reset-password
   https://www.yourdomain.com/auth/reset-password  (if you use www)
   ```
   
   ⚠️ **Important:** 
   - Add both port 3000 and 3001 if you're testing on different ports
   - The code uses `window.location.origin` which automatically detects the correct domain
   - You MUST add your production URL when you deploy!

3. **Site URL**
   - **Development:** Set to `http://localhost:3000`
   - **Production:** Set to your production domain (e.g., `https://yourdomain.com`)

4. **Save Changes**

### 🚀 Production Deployment

**Yes, it will work in production!** The code automatically uses the correct domain:

```typescript
redirectTo: `${window.location.origin}/auth/reset-password`
```

This means:
- ✅ In development: Uses `http://localhost:3000/auth/reset-password`
- ✅ In production: Uses `https://yourdomain.com/auth/reset-password` automatically

**You just need to:**
1. Add your production URL to Supabase's "Redirect URLs" list
2. Update "Site URL" to your production domain
3. That's it! The code handles the rest automatically.

## 🔍 Troubleshooting

### ⚠️ CRITICAL: "Reset link validation timed out" or Token Parameter in URL

**This is a CRITICAL error that means the redirect URL is NOT whitelisted in Supabase!**

**Symptoms:**
- Error message: "Reset link validation timed out"
- URL contains `token=` parameter (e.g., `?token=pkce_...&type=recovery`)
- No `code` parameter in the URL after redirect

**Root Cause:**
When you click a password reset link like:
```
https://[project].supabase.co/auth/v1/verify?token=...&type=recovery&redirect_to=http://localhost:3001/auth/reset-password
```

Supabase should redirect to your app with a `code` parameter. If the redirect URL is NOT whitelisted, Supabase either:
1. Doesn't redirect at all (shows error on Supabase page)
2. Redirects but without the `code` parameter (causes timeout error)

**Solution:**
1. **Go to Supabase Dashboard**
   - Navigate to: Authentication → URL Configuration
   - Or use direct link: `https://supabase.com/dashboard/project/ivcsxedmkuyutfvudyfl/auth/url-configuration`

2. **Add the EXACT redirect URL:**
   ```
   http://localhost:3001/auth/reset-password
   ```
   (Also add `http://localhost:3000/auth/reset-password` if you use port 3000)

3. **Save Changes**

4. **Request a NEW password reset email** (old links won't work)

5. **Click the new reset link** - it should now work!

**The code now detects this issue and shows a clear error message with instructions.**

### Issue: "Reset link validation timed out" (General)

**Possible causes:**
1. Redirect URL not whitelisted in Supabase (see above)
2. Wrong port in redirect URL (check if app is on 3000 vs 3001)
3. Link expired (reset links expire after 1 hour by default)

**Solution:**
- Check Supabase dashboard → Authentication → URL Configuration
- Make sure the exact redirect URL is in the whitelist
- Request a new password reset email

### Issue: "Missing recovery code or token"

**Possible causes:**
1. Link was copied/pasted incorrectly
2. Link was opened in a different browser
3. Browser blocked the redirect

**Solution:**
- Click the link directly from the email (don't copy/paste)
- Make sure you're using the same browser
- Check browser console for errors

### Issue: Link redirects to wrong port

The code uses `window.location.origin` which automatically detects the correct port. However, if Supabase has a cached redirect URL, you may need to:
1. Clear Supabase cache (wait a few minutes)
2. Request a new password reset email
3. Make sure the redirect URL in Supabase settings matches your app's URL

## 🧪 Testing

1. Request password reset from the login page
2. Check email for reset link
3. Click the link (don't copy/paste)
4. Should redirect to `/auth/reset-password`
5. Enter new password
6. Should redirect to login page

## 📝 Notes

- Reset links expire after 1 hour (Supabase default)
- Only the most recent reset link is valid (older links are invalidated)
- The redirect URL must match exactly (including protocol, port, and path)

