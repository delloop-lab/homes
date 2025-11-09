-- =============================================
-- GUEST CHECK-IN SYSTEM SCHEMA
-- =============================================

-- =============================================
-- GUEST CHECK-IN TOKENS TABLE
-- =============================================
CREATE TABLE guest_checkin_tokens (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    guest_email VARCHAR(255) NOT NULL,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Token validity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Token status
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES auth.users(id),
    revoke_reason TEXT,
    
    -- Security tracking
    ip_addresses INET[],
    user_agents TEXT[],
    last_ip INET,
    last_user_agent TEXT
);

-- Indexes for efficient querying
CREATE INDEX idx_guest_checkin_tokens_token ON guest_checkin_tokens(token);
CREATE INDEX idx_guest_checkin_tokens_booking ON guest_checkin_tokens(booking_id);
CREATE INDEX idx_guest_checkin_tokens_property ON guest_checkin_tokens(property_id);
CREATE INDEX idx_guest_checkin_tokens_expires ON guest_checkin_tokens(expires_at);
CREATE INDEX idx_guest_checkin_tokens_active ON guest_checkin_tokens(is_active);

-- =============================================
-- PROPERTY INFORMATION TABLE
-- =============================================
CREATE TABLE property_information (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    
    -- Check-in instructions
    checkin_instructions TEXT,
    checkout_instructions TEXT,
    
    -- Access information
    entry_method VARCHAR(50), -- 'keypad', 'lockbox', 'key', 'smart_lock', 'concierge'
    access_code VARCHAR(50),
    access_instructions TEXT,
    
    -- WiFi information
    wifi_network VARCHAR(255),
    wifi_password VARCHAR(255),
    wifi_instructions TEXT,
    
    -- Property amenities
    amenities JSONB, -- Array of amenities
    
    -- House rules
    house_rules TEXT[],
    quiet_hours VARCHAR(100), -- e.g., "10:00 PM - 8:00 AM"
    max_guests INTEGER,
    smoking_allowed BOOLEAN DEFAULT false,
    pets_allowed BOOLEAN DEFAULT false,
    parties_allowed BOOLEAN DEFAULT false,
    
    -- Local information
    local_tips TEXT,
    nearby_restaurants JSONB,
    nearby_attractions JSONB,
    transportation_info TEXT,
    emergency_contacts JSONB,
    
    -- Utility information
    parking_instructions TEXT,
    trash_pickup_day VARCHAR(20),
    recycling_instructions TEXT,
    
    -- Property specifics
    appliance_instructions JSONB,
    special_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one record per property
    UNIQUE(property_id)
);

-- Index for property lookup
CREATE INDEX idx_property_information_property ON property_information(property_id);

-- =============================================
-- GUEST ACCESS LOGS TABLE
-- =============================================
CREATE TABLE guest_access_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    token_id UUID NOT NULL REFERENCES guest_checkin_tokens(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Access details
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    
    -- Page interaction
    pages_viewed TEXT[],
    time_spent_seconds INTEGER,
    actions_performed JSONB,
    
    -- Device information
    device_type VARCHAR(50),
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Location (if available)
    city VARCHAR(100),
    country VARCHAR(100)
);

-- Indexes for access logs
CREATE INDEX idx_guest_access_logs_token ON guest_access_logs(token_id);
CREATE INDEX idx_guest_access_logs_booking ON guest_access_logs(booking_id);
CREATE INDEX idx_guest_access_logs_accessed ON guest_access_logs(accessed_at);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update property information timestamp
CREATE OR REPLACE FUNCTION update_property_info_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for property information
CREATE TRIGGER trigger_update_property_info_timestamp
    BEFORE UPDATE ON property_information
    FOR EACH ROW
    EXECUTE FUNCTION update_property_info_timestamp();

-- Function to generate secure token
CREATE OR REPLACE FUNCTION generate_guest_token()
RETURNS TEXT AS $$
DECLARE
    token TEXT;
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Generate a secure random token (URL-safe)
        token := encode(gen_random_bytes(32), 'base64');
        token := replace(replace(replace(token, '+', '-'), '/', '_'), '=', '');
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM guest_checkin_tokens WHERE token = token) INTO exists_check;
        
        -- Exit loop if token is unique
        IF NOT exists_check THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to create guest check-in token
CREATE OR REPLACE FUNCTION create_guest_checkin_token(
    p_booking_id UUID,
    p_expires_days INTEGER DEFAULT 30
)
RETURNS TABLE(token TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_booking RECORD;
BEGIN
    -- Get booking details
    SELECT 
        b.id,
        b.guest_name,
        b.contact_email,
        b.property_id,
        b.check_out
    INTO v_booking
    FROM bookings b
    WHERE b.id = p_booking_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found: %', p_booking_id;
    END IF;
    
    IF v_booking.contact_email IS NULL THEN
        RAISE EXCEPTION 'Booking must have guest email for check-in token';
    END IF;
    
    -- Calculate expiration (either p_expires_days or 3 days after checkout, whichever is later)
    v_expires_at := GREATEST(
        NOW() + INTERVAL '1 day' * p_expires_days,
        v_booking.check_out + INTERVAL '3 days'
    );
    
    -- Generate unique token
    v_token := generate_guest_token();
    
    -- Insert or update token (upsert by booking_id)
    INSERT INTO guest_checkin_tokens (
        booking_id,
        token,
        guest_name,
        guest_email,
        property_id,
        expires_at
    ) VALUES (
        p_booking_id,
        v_token,
        v_booking.guest_name,
        v_booking.contact_email,
        v_booking.property_id,
        v_expires_at
    )
    ON CONFLICT (booking_id) 
    DO UPDATE SET
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        is_active = true,
        revoked_at = NULL,
        revoked_by = NULL,
        revoke_reason = NULL,
        created_at = NOW();
    
    RETURN QUERY SELECT v_token, v_expires_at;
END;
$$ LANGUAGE plpgsql;

-- Function to validate guest token
CREATE OR REPLACE FUNCTION validate_guest_token(
    p_token TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE(
    is_valid BOOLEAN,
    token_id UUID,
    booking_id UUID,
    property_id UUID,
    guest_name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
DECLARE
    v_token_record RECORD;
BEGIN
    -- Get token details
    SELECT 
        gct.id,
        gct.booking_id,
        gct.property_id,
        gct.guest_name,
        gct.expires_at,
        gct.is_active,
        gct.revoked_at,
        gct.access_count,
        gct.ip_addresses,
        gct.user_agents
    INTO v_token_record
    FROM guest_checkin_tokens gct
    WHERE gct.token = p_token;
    
    -- Token not found
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, 'Invalid token';
        RETURN;
    END IF;
    
    -- Token revoked
    IF NOT v_token_record.is_active OR v_token_record.revoked_at IS NOT NULL THEN
        RETURN QUERY SELECT false, v_token_record.id, v_token_record.booking_id, v_token_record.property_id, v_token_record.guest_name, v_token_record.expires_at, 'Token has been revoked';
        RETURN;
    END IF;
    
    -- Token expired
    IF v_token_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, v_token_record.id, v_token_record.booking_id, v_token_record.property_id, v_token_record.guest_name, v_token_record.expires_at, 'Token has expired';
        RETURN;
    END IF;
    
    -- Update access tracking
    UPDATE guest_checkin_tokens SET
        accessed_at = NOW(),
        access_count = access_count + 1,
        ip_addresses = CASE 
            WHEN p_ip_address IS NOT NULL AND NOT (p_ip_address = ANY(ip_addresses)) 
            THEN ip_addresses || p_ip_address 
            ELSE ip_addresses 
        END,
        user_agents = CASE 
            WHEN p_user_agent IS NOT NULL AND NOT (p_user_agent = ANY(user_agents)) 
            THEN user_agents || p_user_agent 
            ELSE user_agents 
        END,
        last_ip = COALESCE(p_ip_address, last_ip),
        last_user_agent = COALESCE(p_user_agent, last_user_agent)
    WHERE id = v_token_record.id;
    
    -- Log access
    IF p_ip_address IS NOT NULL OR p_user_agent IS NOT NULL THEN
        INSERT INTO guest_access_logs (
            token_id,
            booking_id,
            ip_address,
            user_agent
        ) VALUES (
            v_token_record.id,
            v_token_record.booking_id,
            p_ip_address,
            p_user_agent
        );
    END IF;
    
    -- Return valid token info
    RETURN QUERY SELECT true, v_token_record.id, v_token_record.booking_id, v_token_record.property_id, v_token_record.guest_name, v_token_record.expires_at, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke guest token
CREATE OR REPLACE FUNCTION revoke_guest_token(
    p_token TEXT,
    p_revoked_by UUID DEFAULT NULL,
    p_reason TEXT DEFAULT 'Manual revocation'
)
RETURNS BOOLEAN AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE guest_checkin_tokens SET
        is_active = false,
        revoked_at = NOW(),
        revoked_by = p_revoked_by,
        revoke_reason = p_reason
    WHERE token = p_token AND is_active = true;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Deactivate expired tokens
    UPDATE guest_checkin_tokens SET
        is_active = false,
        revoked_at = NOW(),
        revoke_reason = 'Automatic expiration'
    WHERE expires_at < NOW() AND is_active = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup activity
    INSERT INTO audit_log (
        table_name,
        action,
        new_values,
        created_at
    ) VALUES (
        'guest_checkin_tokens',
        'CLEANUP',
        jsonb_build_object('expired_tokens_count', expired_count),
        NOW()
    );
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get guest check-in information
CREATE OR REPLACE FUNCTION get_guest_checkin_info(p_token TEXT)
RETURNS TABLE(
    booking_info JSONB,
    property_info JSONB,
    checkin_info JSONB
) AS $$
DECLARE
    v_validation RECORD;
    v_booking RECORD;
    v_property RECORD;
    v_prop_info RECORD;
BEGIN
    -- Validate token first
    SELECT * INTO v_validation
    FROM validate_guest_token(p_token);
    
    IF NOT v_validation.is_valid THEN
        RAISE EXCEPTION '%', v_validation.error_message;
    END IF;
    
    -- Get booking information
    SELECT 
        b.id,
        b.guest_name,
        b.contact_email,
        b.contact_phone,
        b.check_in,
        b.check_out,
        b.nights,
        b.booking_platform,
        b.notes,
        b.status
    INTO v_booking
    FROM bookings b
    WHERE b.id = v_validation.booking_id;
    
    -- Get property information (aligns with base properties schema)
    SELECT 
        p.id,
        p.name,
        p.address,
        p.notes
    INTO v_property
    FROM properties p
    WHERE p.id = v_validation.property_id;
    
    -- Get property detailed information
    SELECT 
        pi.checkin_instructions,
        pi.checkout_instructions,
        pi.entry_method,
        pi.access_code,
        pi.access_instructions,
        pi.wifi_network,
        pi.wifi_password,
        pi.wifi_instructions,
        pi.amenities,
        pi.house_rules,
        pi.quiet_hours,
        pi.max_guests as pi_max_guests,
        pi.smoking_allowed,
        pi.pets_allowed,
        pi.parties_allowed,
        pi.local_tips,
        pi.nearby_restaurants,
        pi.nearby_attractions,
        pi.transportation_info,
        pi.emergency_contacts,
        pi.parking_instructions,
        pi.trash_pickup_day,
        pi.recycling_instructions,
        pi.appliance_instructions,
        pi.special_notes
    INTO v_prop_info
    FROM property_information pi
    WHERE pi.property_id = v_validation.property_id;
    
    -- Return structured information
    RETURN QUERY SELECT 
        jsonb_build_object(
            'id', v_booking.id,
            'guest_name', v_booking.guest_name,
            'contact_email', v_booking.contact_email,
            'contact_phone', v_booking.contact_phone,
            'check_in', v_booking.check_in,
            'check_out', v_booking.check_out,
            'nights', v_booking.nights,
            'platform', v_booking.booking_platform,
            'notes', v_booking.notes,
            'status', v_booking.status
        ) as booking_info,
        
        jsonb_build_object(
            'id', v_property.id,
            'name', v_property.name,
            'address', v_property.address,
            'notes', v_property.notes
        ) as property_info,
        
        jsonb_build_object(
            'checkin_instructions', COALESCE(v_prop_info.checkin_instructions, 'Welcome to your stay!'),
            'checkout_instructions', COALESCE(v_prop_info.checkout_instructions, 'Thank you for staying with us!'),
            'entry_method', v_prop_info.entry_method,
            'access_code', v_prop_info.access_code,
            'access_instructions', v_prop_info.access_instructions,
            'wifi', jsonb_build_object(
                'network', v_prop_info.wifi_network,
                'password', v_prop_info.wifi_password,
                'instructions', v_prop_info.wifi_instructions
            ),
            'amenities', COALESCE(v_prop_info.amenities, '[]'::jsonb),
            'house_rules', COALESCE(v_prop_info.house_rules, ARRAY[]::text[]),
            'quiet_hours', v_prop_info.quiet_hours,
            'max_guests', v_prop_info.pi_max_guests,
            'policies', jsonb_build_object(
                'smoking_allowed', COALESCE(v_prop_info.smoking_allowed, false),
                'pets_allowed', COALESCE(v_prop_info.pets_allowed, false),
                'parties_allowed', COALESCE(v_prop_info.parties_allowed, false)
            ),
            'local_info', jsonb_build_object(
                'tips', v_prop_info.local_tips,
                'restaurants', COALESCE(v_prop_info.nearby_restaurants, '[]'::jsonb),
                'attractions', COALESCE(v_prop_info.nearby_attractions, '[]'::jsonb),
                'transportation', v_prop_info.transportation_info
            ),
            'emergency_contacts', COALESCE(v_prop_info.emergency_contacts, '[]'::jsonb),
            'parking_instructions', v_prop_info.parking_instructions,
            'trash_pickup_day', v_prop_info.trash_pickup_day,
            'recycling_instructions', v_prop_info.recycling_instructions,
            'appliance_instructions', COALESCE(v_prop_info.appliance_instructions, '{}'::jsonb),
            'special_notes', v_prop_info.special_notes
        ) as checkin_info;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on guest tables
ALTER TABLE guest_checkin_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guest_checkin_tokens
CREATE POLICY "Hosts can manage tokens for their properties" ON guest_checkin_tokens
    FOR ALL USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Allow public access to validate tokens (used by guest page)
CREATE POLICY "Public can validate tokens" ON guest_checkin_tokens
    FOR SELECT USING (true);

-- RLS Policies for property_information
CREATE POLICY "Hosts can manage their property information" ON property_information
    FOR ALL USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- RLS Policies for guest_access_logs
CREATE POLICY "Hosts can view access logs for their properties" ON guest_access_logs
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.host_id = auth.uid()
        )
    );

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional indexes for common queries
CREATE INDEX idx_property_information_updated ON property_information(updated_at);
CREATE INDEX idx_guest_access_logs_date ON guest_access_logs(accessed_at DESC);

-- Partial indexes for active tokens
CREATE INDEX idx_guest_tokens_active_expires ON guest_checkin_tokens(expires_at) 
    WHERE is_active = true;

-- =============================================
-- INITIAL DATA AND EXAMPLES
-- =============================================

-- Sample property information (can be customized per property)
-- INSERT INTO property_information (property_id, checkin_instructions, house_rules, wifi_network, wifi_password)
-- SELECT 
--     id,
--     'Welcome! Your entry code is provided below. Check-in time is 3:00 PM.',
--     ARRAY['No smoking indoors', 'Quiet hours: 10 PM - 8 AM', 'Maximum 4 guests', 'No parties or events'],
--     'GuestWiFi',
--     'welcome123'
-- FROM properties
-- WHERE host_id = 'your-host-id'
-- ON CONFLICT (property_id) DO NOTHING;

-- =============================================
-- CLEANUP AND MAINTENANCE
-- =============================================

-- Schedule for automatic cleanup (can be run via cron job)
-- SELECT cleanup_expired_tokens();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON guest_checkin_tokens TO anon;
GRANT EXECUTE ON FUNCTION validate_guest_token TO anon;
GRANT EXECUTE ON FUNCTION get_guest_checkin_info TO anon;