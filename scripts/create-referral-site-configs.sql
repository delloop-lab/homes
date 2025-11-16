-- Create table for referral site configurations per property
-- This allows users to store credentials, IDs, and settings for any referral site

CREATE TABLE IF NOT EXISTS referral_site_configs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'booking.com', 'airbnb', 'vrbo', etc.
    hotel_id VARCHAR(100), -- Booking.com hotel_id, Airbnb listing ID, etc.
    account_number VARCHAR(100), -- Account number for the platform
    username VARCHAR(255), -- Login username/email
    api_key TEXT, -- API key if available
    api_secret TEXT, -- API secret if available
    extranet_url TEXT, -- Base URL for extranet/admin access
    config_data JSONB DEFAULT '{}'::jsonb, -- Flexible JSON for platform-specific settings
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one config per property per platform
    UNIQUE(property_id, platform)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referral_site_configs_property_id 
ON referral_site_configs(property_id);

CREATE INDEX IF NOT EXISTS idx_referral_site_configs_platform 
ON referral_site_configs(platform);

-- RLS Policies
ALTER TABLE referral_site_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referral site configs for their properties"
    ON referral_site_configs FOR SELECT
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert referral site configs for their properties"
    ON referral_site_configs FOR INSERT
    WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can update referral site configs for their properties"
    ON referral_site_configs FOR UPDATE
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete referral site configs for their properties"
    ON referral_site_configs FOR DELETE
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Add comment
COMMENT ON TABLE referral_site_configs IS 'Stores referral site credentials and configuration per property';
COMMENT ON COLUMN referral_site_configs.config_data IS 'Flexible JSONB field for platform-specific settings (e.g., {"session_token": "...", "last_sync": "..."})';



