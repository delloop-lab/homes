-- Short-Term Rental Host App Database Schema
-- This file contains the complete database schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- =============================================
-- PROPERTIES TABLE
-- =============================================
CREATE TABLE properties (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    notes TEXT,
    host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties indexes
CREATE INDEX idx_properties_host_id ON properties(host_id);
CREATE INDEX idx_properties_name ON properties(name);
CREATE INDEX idx_properties_created_at ON properties(created_at);

-- Properties RLS policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own properties" 
    ON properties FOR SELECT 
    USING (auth.uid() = host_id);

CREATE POLICY "Users can insert their own properties" 
    ON properties FOR INSERT 
    WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Users can update their own properties" 
    ON properties FOR UPDATE 
    USING (auth.uid() = host_id);

CREATE POLICY "Users can delete their own properties" 
    ON properties FOR DELETE 
    USING (auth.uid() = host_id);

-- =============================================
-- BOOKINGS TABLE
-- =============================================
CREATE TABLE bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    guest_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    guest_first_name VARCHAR(100),
    guest_last_initial VARCHAR(5),
    check_in TIMESTAMP WITH TIME ZONE NOT NULL,
    check_out TIMESTAMP WITH TIME ZONE NOT NULL,
    nights INTEGER GENERATED ALWAYS AS (
        EXTRACT(DAY FROM (check_out - check_in))
    ) STORED,
    notes TEXT,
    passport_image_url TEXT,
    event_uid VARCHAR(500) UNIQUE, -- Unique ID from ICS calendar events
    booking_platform VARCHAR(50) DEFAULT 'manual', -- airbnb, vrbo, booking, manual
    reservation_url TEXT,
    guest_phone_last4 VARCHAR(4),
    listing_name TEXT,
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings indexes
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_check_in ON bookings(check_in);
CREATE INDEX idx_bookings_check_out ON bookings(check_out);
CREATE INDEX idx_bookings_event_uid ON bookings(event_uid);
CREATE INDEX idx_bookings_guest_name ON bookings(guest_name);
CREATE INDEX idx_bookings_platform ON bookings(booking_platform);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- Composite index for date range queries
CREATE INDEX idx_bookings_property_dates ON bookings(property_id, check_in, check_out);

-- Bookings RLS policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view bookings for their properties" 
    ON bookings FOR SELECT 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert bookings for their properties" 
    ON bookings FOR INSERT 
    WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can update bookings for their properties" 
    ON bookings FOR UPDATE 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete bookings for their properties" 
    ON bookings FOR DELETE 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- =============================================
-- CLEANINGS TABLE
-- =============================================
CREATE TABLE cleanings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    cleaning_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    cleaner_name VARCHAR(255),
    cleaner_contact VARCHAR(255),
    cost DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cleanings indexes
CREATE INDEX idx_cleanings_property_id ON cleanings(property_id);
CREATE INDEX idx_cleanings_date ON cleanings(cleaning_date);
CREATE INDEX idx_cleanings_status ON cleanings(status);
CREATE INDEX idx_cleanings_created_at ON cleanings(created_at);

-- Composite index for property and date queries
CREATE INDEX idx_cleanings_property_date ON cleanings(property_id, cleaning_date);

-- Cleanings RLS policies
ALTER TABLE cleanings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cleanings for their properties" 
    ON cleanings FOR SELECT 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert cleanings for their properties" 
    ON cleanings FOR INSERT 
    WITH CHECK (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can update cleanings for their properties" 
    ON cleanings FOR UPDATE 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete cleanings for their properties" 
    ON cleanings FOR DELETE 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- =============================================
-- ADDITIONAL USEFUL TABLES
-- =============================================

-- Calendar Sources table for managing multiple platform integrations
CREATE TABLE calendar_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- airbnb, vrbo, booking, other
    name VARCHAR(255) NOT NULL,
    ics_url TEXT NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'success', 'error')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_sources_property_id ON calendar_sources(property_id);
CREATE INDEX idx_calendar_sources_platform ON calendar_sources(platform);
CREATE INDEX idx_calendar_sources_sync_enabled ON calendar_sources(sync_enabled);

-- Calendar sources RLS
ALTER TABLE calendar_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage calendar sources for their properties" 
    ON calendar_sources FOR ALL 
    USING (
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers to all tables
CREATE TRIGGER update_properties_updated_at 
    BEFORE UPDATE ON properties 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cleanings_updated_at 
    BEFORE UPDATE ON cleanings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_sources_updated_at 
    BEFORE UPDATE ON calendar_sources 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to prevent overlapping bookings
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM bookings 
        WHERE property_id = NEW.property_id
        AND id != COALESCE(NEW.id, uuid_generate_v4())
        AND status NOT IN ('cancelled')
        AND (
            (NEW.check_in >= check_in AND NEW.check_in < check_out) OR
            (NEW.check_out > check_in AND NEW.check_out <= check_out) OR
            (NEW.check_in <= check_in AND NEW.check_out >= check_out)
        )
    ) THEN
        RAISE EXCEPTION 'Booking overlaps with existing reservation';
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add overlap check trigger
CREATE TRIGGER check_booking_overlap_trigger
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for bookings with property information
CREATE VIEW bookings_with_properties AS
SELECT 
    b.*,
    p.name as property_name,
    p.address as property_address,
    p.host_id
FROM bookings b
JOIN properties p ON b.property_id = p.id;

-- View for upcoming cleanings
CREATE VIEW upcoming_cleanings AS
SELECT 
    c.*,
    p.name as property_name,
    p.address as property_address
FROM cleanings c
JOIN properties p ON c.property_id = p.id
WHERE c.cleaning_date >= NOW()
AND c.status NOT IN ('completed', 'cancelled')
ORDER BY c.cleaning_date;

-- View for current and upcoming bookings
CREATE VIEW current_and_upcoming_bookings AS
SELECT 
    b.*,
    p.name as property_name,
    p.address as property_address
FROM bookings b
JOIN properties p ON b.property_id = p.id
WHERE b.check_out >= NOW()
AND b.status NOT IN ('cancelled')
ORDER BY b.check_in;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Note: Uncomment these INSERT statements if you want sample data
-- Make sure to replace 'your-user-id' with an actual user ID from auth.users

/*
-- Sample property
INSERT INTO properties (id, name, address, notes, host_id) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Downtown Apartment', '123 Main St, Downtown', 'Modern 2BR apartment', 'your-user-id');

-- Sample bookings
INSERT INTO bookings (property_id, guest_name, contact_email, check_in, check_out, booking_platform, total_amount) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'John Smith', 'john@example.com', '2024-02-15 15:00:00+00', '2024-02-18 11:00:00+00', 'airbnb', 450.00),
('550e8400-e29b-41d4-a716-446655440001', 'Sarah Johnson', 'sarah@example.com', '2024-02-20 15:00:00+00', '2024-02-25 11:00:00+00', 'vrbo', 1200.00);

-- Sample cleanings
INSERT INTO cleanings (property_id, cleaning_date, cleaner_name, cost) VALUES 
('550e8400-e29b-41d4-a716-446655440001', '2024-02-18 13:00:00+00', 'Maria Garcia', 80.00),
('550e8400-e29b-41d4-a716-446655440001', '2024-02-25 13:00:00+00', 'Maria Garcia', 80.00);
*/