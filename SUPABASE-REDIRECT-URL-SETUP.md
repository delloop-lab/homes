# How to Add Redirect URLs in Supabase Dashboard

## Step-by-Step Instructions

### Method 1: Authentication Settings (Most Common)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Navigate to Authentication**
   - In the left sidebar, click **"Authentication"**
   - Then click **"URL Configuration"** (or "Providers" → "URL Configuration")

3. **Add Redirect URLs**
   - Look for a section called **"Redirect URLs"** or **"Site URL"**
   - You should see a text area or input field
   - Add these URLs (one per line or comma-separated):
     ```
     http://localhost:3000/auth/reset-password
     http://localhost:3001/auth/reset-password
     ```

4. **Update Site URL** (if there's a separate field)
   - Set to: `http://localhost:3000`

5. **Save Changes**
   - Click the "Save" or "Update" button

### Method 2: Project Settings

1. **Go to Project Settings**
   - Click the gear icon (⚙️) in the left sidebar
   - Or click **"Project Settings"**

2. **Navigate to Authentication**
   - Click **"Authentication"** in the settings menu
   - Look for **"URL Configuration"** or **"Redirect URLs"**

3. **Add URLs** (same as above)

### Method 3: API Settings

1. **Go to Project Settings → API**
2. **Look for "Redirect URLs"** section
3. **Add URLs** (same as above)

## If You Still Can't Find It

The redirect URL configuration might be:
- Under **"Auth"** → **"Settings"** → **"URL Configuration"**
- Under **"Settings"** → **"Auth"** → **"URL Configuration"**
- In a **"Redirect URLs"** textarea field
- As a **"Site URL"** field (for the main site)
- As **"Additional Redirect URLs"** or **"Allowed Redirect URLs"**

## Alternative: Check Supabase Documentation

1. Go to: https://supabase.com/docs/guides/auth
2. Search for "redirect URL" or "URL configuration"
3. Follow the latest instructions

## Still Having Issues?

If you can't find the redirect URL setting, it's possible:
1. Your Supabase plan might have different settings
2. The UI might have changed
3. You might need to use the Supabase CLI or API

**Can you tell me:**
- What options do you see under "Authentication" in the left sidebar?
- What do you see when you click "Project Settings"?
- Are there any tabs or sections related to "URL", "Redirect", or "Configuration"?

This will help me give you more specific instructions!



