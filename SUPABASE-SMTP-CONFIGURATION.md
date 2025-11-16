# Supabase SMTP Configuration for Password Reset Emails

## 🎯 Goal
Configure Supabase to send password reset emails from **myguests.com** (or your custom domain) instead of Supabase's default email service.

## ⚠️ Important Note

**Password reset emails are sent by Supabase Auth, NOT by your application code.**

When you call `supabase.auth.resetPasswordForEmail()`, Supabase handles the email sending internally. Your app's email service (Resend) is NOT used for password reset emails.

## ✅ Step-by-Step Configuration

### 1. Go to Supabase SMTP Settings

1. Navigate to: https://supabase.com/dashboard/project/ivcsxedmkuyutfvudyfl/settings/auth
2. Scroll down to **"SMTP Settings"** section
3. Or go directly to: Project Settings → Authentication → SMTP Settings

### 2. Enable Custom SMTP

1. **Toggle "Enable Custom SMTP"** to ON
2. Fill in your SMTP credentials:

   **Required Fields:**
   - **Sender Email**: `noreply@myguests.com` (or your verified domain email)
   - **Sender Name**: `MyGuests` (or your app name)
   - **SMTP Host**: Your SMTP server (e.g., `smtp.resend.com`, `smtp.sendgrid.net`)
   - **SMTP Port**: Usually `587` (TLS) or `465` (SSL)
   - **SMTP User**: Your SMTP username/API key
   - **SMTP Password**: Your SMTP password/API key

### 3. SMTP Provider Examples

#### If using Resend:
```
SMTP Host: smtp.resend.com
SMTP Port: 587
SMTP User: resend
SMTP Password: [Your Resend API Key starting with re_]
Sender Email: noreply@myguests.com (must be verified domain)
```

#### If using SendGrid:
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender Email: noreply@myguests.com
```

#### If using Mailgun:
```
SMTP Host: smtp.mailgun.org
SMTP Port: 587
SMTP User: [Your Mailgun SMTP username]
SMTP Password: [Your Mailgun SMTP password]
Sender Email: noreply@myguests.com
```

### 4. Verify Domain (IMPORTANT)

**Before emails will work, you MUST verify your domain with your SMTP provider:**

- **Resend**: Go to Resend Dashboard → Domains → Add Domain → Follow DNS setup
- **SendGrid**: Go to SendGrid Dashboard → Settings → Sender Authentication → Domain Authentication
- **Mailgun**: Go to Mailgun Dashboard → Sending → Domains → Add Domain

### 5. Test the Configuration

1. **Save the SMTP settings** in Supabase
2. **Request a password reset** from your app
3. **Check the email** - it should come from `noreply@myguests.com` (or your configured sender)
4. **Check the "From" field** in the email headers

### 6. Verify It's Working

After configuring, test by:

1. Request password reset: `lou@schillaci.me`
2. Check email sender:
   - ✅ **Should be**: `noreply@myguests.com` or your configured sender
   - ❌ **Should NOT be**: `noreply@supabase.co` or any Supabase domain

## 🔍 Troubleshooting

### Issue: Emails still coming from Supabase

**Possible causes:**
1. **SMTP not enabled**: Check that "Enable Custom SMTP" is toggled ON
2. **Domain not verified**: Your SMTP provider requires domain verification
3. **Wrong credentials**: Double-check SMTP host, port, user, password
4. **Sender email not verified**: The sender email must be from a verified domain

**Solution:**
- Go to Supabase Dashboard → Authentication → SMTP Settings
- Verify all fields are correct
- Check SMTP provider dashboard for domain verification status
- Test SMTP connection if Supabase provides a test button

### Issue: "SMTP connection failed"

**Possible causes:**
1. Wrong SMTP host/port
2. Incorrect credentials
3. Firewall blocking SMTP port
4. SMTP provider requires IP whitelisting

**Solution:**
- Verify SMTP host and port with your provider
- Check credentials are correct
- Test SMTP connection from another tool (like Mailtrap)
- Check if your SMTP provider requires IP whitelisting

### Issue: Emails not being sent at all

**Possible causes:**
1. SMTP configuration is incorrect
2. Domain not verified with SMTP provider
3. Rate limits exceeded
4. SMTP provider blocking emails

**Solution:**
- Check Supabase Auth Logs for SMTP errors
- Verify domain is verified in SMTP provider dashboard
- Check SMTP provider for rate limits or blocks
- Test with a different email address

## 📋 Checklist

- [ ] Custom SMTP enabled in Supabase Dashboard
- [ ] SMTP host, port, user, password configured correctly
- [ ] Sender email is from a verified domain (e.g., `noreply@myguests.com`)
- [ ] Domain verified with SMTP provider (Resend/SendGrid/Mailgun)
- [ ] Tested password reset email - comes from your domain
- [ ] Checked email headers - "From" field shows your domain

## 🎯 Expected Result

After configuration:
- ✅ Password reset emails come from: `noreply@myguests.com` (or your domain)
- ✅ Email headers show your domain as sender
- ✅ No Supabase branding in sender address
- ✅ Better deliverability (emails less likely to go to spam)

## 📝 Notes

- **Your app's Resend configuration** (in `lib/email.ts`) is for **booking emails**, not password resets
- **Password reset emails** are handled entirely by Supabase Auth
- You **cannot** customize password reset email templates in your app code
- Email template customization must be done in Supabase Dashboard → Authentication → Email Templates

