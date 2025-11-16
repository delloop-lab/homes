-- Add currency fields to referral_site_configs
ALTER TABLE referral_site_configs
ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(5);

COMMENT ON COLUMN referral_site_configs.currency_code IS 'ISO currency code (e.g., USD, EUR, NGN)';
COMMENT ON COLUMN referral_site_configs.currency_symbol IS 'Currency symbol displayed in UI (e.g., $, €, ₦)';




