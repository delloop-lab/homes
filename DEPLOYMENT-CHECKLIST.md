# Deployment Checklist - Password Reset

## ✅ Pre-Deployment

Before deploying to production, make sure password reset is configured:

### 1. Supabase Configuration

Go to **Supabase Dashboard → Authentication → URL Configuration** and add:

**Development URLs (for testing):**
- `http://localhost:3000/auth/reset-password`
- `http://localhost:3001/auth/reset-password`

**Production URLs (replace with your domain):**
- `https://yourdomain.com/auth/reset-password`
- `https://www.yourdomain.com/auth/reset-password` (if you use www)

### 2. Site URL

- **Development:** `http://localhost:3000`
- **Production:** `https://yourdomain.com` (your actual domain)

### 3. Code is Ready ✅

The code already handles this automatically:
- Uses `window.location.origin` to detect the current domain
- Works in both development and production
- No code changes needed when deploying

## 🚀 At Deployment Time

1. **Add Production URL to Supabase**
   - Go to Supabase Dashboard
   - Authentication → URL Configuration
   - Add: `https://yourdomain.com/auth/reset-password`
   - Update Site URL to: `https://yourdomain.com`
   - Save

2. **Test Password Reset**
   - Request a password reset from production site
   - Check email for reset link
   - Click link - should work!

## 📝 Notes

- The redirect URL must match **exactly** (including `https://` and the path)
- You can have multiple redirect URLs (dev + production)
- The code automatically uses the correct domain based on where it's running
- No environment variables needed for this - it's automatic!



