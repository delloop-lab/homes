-- Add password_encrypted column to referral_site_configs table
-- This stores encrypted passwords for referral site logins

ALTER TABLE referral_site_configs 
ADD COLUMN IF NOT EXISTS password_encrypted TEXT;

-- Add comment
COMMENT ON COLUMN referral_site_configs.password_encrypted IS 'Encrypted password for referral site login (encrypted using AES-256-GCM)';



