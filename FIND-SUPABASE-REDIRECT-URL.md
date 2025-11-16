# Finding Redirect URL Settings in Supabase Dashboard

## Exact Steps to Find It

### Step 1: Go to Your Project
1. Visit: https://supabase.com/dashboard
2. Click on your project (the one with ID: `ivcsxedmkuyutfvudyfl`)

### Step 2: Look for Authentication
In the **left sidebar**, you should see:
- Database
- Authentication ← **Click this one**
- Storage
- Edge Functions
- etc.

### Step 3: Check These Locations

**Option A: URL Configuration Tab**
- After clicking "Authentication", look for tabs at the top:
  - Users
  - Policies
  - **URL Configuration** ← Check here
  - Providers
  - Email Templates

**Option B: Settings/Configuration**
- Click "Authentication" in sidebar
- Look for a **gear icon** or **"Settings"** button
- Click it to see URL configuration

**Option C: Project Settings**
1. Click the **gear icon (⚙️)** at the bottom of the left sidebar
2. Click **"Authentication"** in the settings menu
3. Look for **"URL Configuration"** or **"Redirect URLs"**

## What to Look For

You should see fields like:
- **Site URL**: `http://localhost:3000` (or your domain)
- **Redirect URLs**: A text area or list where you can add URLs
- **Additional Redirect URLs**: Another field for extra URLs

## If You Still Can't Find It

**Take a screenshot** of:
1. What you see when you click "Authentication" in the sidebar
2. What tabs/options appear at the top
3. What you see in "Project Settings" → "Authentication"

Or tell me:
- What options/tabs do you see under "Authentication"?
- Do you see "URL Configuration", "Settings", or "Providers"?
- What does the Authentication page look like?

## Alternative: Use Supabase CLI

If the UI doesn't have it, you might need to use the Supabase CLI or API. But let's first confirm what you're seeing in the dashboard.



