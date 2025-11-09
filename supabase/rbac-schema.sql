-- =============================================
-- ROLE-BASED ACCESS CONTROL (RBAC) SCHEMA
-- =============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- USER PROFILES TABLE
-- =============================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cleaner' CHECK (role IN ('host', 'cleaner', 'admin')),
    phone VARCHAR(50),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Host-specific fields
    company_name VARCHAR(255),
    company_address TEXT,
    
    -- Cleaner-specific fields
    hourly_rate DECIMAL(10,2),
    preferred_properties UUID[], -- Array of property IDs cleaner prefers
    availability JSONB, -- Store availability schedule
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_sign_in TIMESTAMP WITH TIME ZONE
);

-- Index for efficient role-based queries
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_active ON user_profiles(is_active);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);

-- =============================================
-- PROPERTY ASSIGNMENTS TABLE (for cleaner access)
-- =============================================
CREATE TABLE property_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    cleaner_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES user_profiles(id), -- Host who assigned
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique active assignments per property-cleaner pair
    UNIQUE(property_id, cleaner_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for property assignments
CREATE INDEX idx_property_assignments_property ON property_assignments(property_id);
CREATE INDEX idx_property_assignments_cleaner ON property_assignments(cleaner_id);
CREATE INDEX idx_property_assignments_active ON property_assignments(is_active);

-- =============================================
-- AUDIT LOG TABLE
-- =============================================
CREATE TABLE audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for audit queries
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update user_profiles timestamp
CREATE OR REPLACE FUNCTION update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER trigger_update_user_profiles_timestamp
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_timestamp();

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'cleaner')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM user_profiles
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'cleaner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is host
CREATE OR REPLACE FUNCTION is_host(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) IN ('host', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is cleaner
CREATE OR REPLACE FUNCTION is_cleaner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_user_role(user_id) IN ('cleaner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if cleaner has access to property
CREATE OR REPLACE FUNCTION cleaner_has_property_access(
    property_id UUID,
    cleaner_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
    has_access BOOLEAN := false;
BEGIN
    -- Check if cleaner is assigned to property
    SELECT EXISTS(
        SELECT 1 FROM property_assignments pa
        WHERE pa.property_id = $1
        AND pa.cleaner_id = cleaner_id
        AND pa.is_active = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get accessible properties for cleaner
CREATE OR REPLACE FUNCTION get_cleaner_properties(cleaner_id UUID DEFAULT auth.uid())
RETURNS TABLE(property_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT pa.property_id
    FROM property_assignments pa
    WHERE pa.cleaner_id = $1
    AND pa.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanings ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER_PROFILES POLICIES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        -- Prevent role changes unless admin
        (OLD.role = NEW.role OR get_user_role(auth.uid()) = 'admin')
    );

-- Hosts can view cleaner profiles for assignment purposes
CREATE POLICY "Hosts can view cleaner profiles" ON user_profiles
    FOR SELECT USING (
        is_host() AND role = 'cleaner' AND is_active = true
    );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (get_user_role() = 'admin');

-- =============================================
-- PROPERTIES POLICIES
-- =============================================

-- Hosts can manage their own properties
CREATE POLICY "Hosts can manage own properties" ON properties
    FOR ALL USING (is_host() AND host_id = auth.uid());

-- Cleaners can view properties they're assigned to
CREATE POLICY "Cleaners can view assigned properties" ON properties
    FOR SELECT USING (
        is_cleaner() AND 
        id IN (SELECT property_id FROM get_cleaner_properties())
    );

-- =============================================
-- BOOKINGS POLICIES
-- =============================================

-- Hosts can manage bookings for their properties
CREATE POLICY "Hosts can manage bookings for own properties" ON bookings
    FOR ALL USING (
        is_host() AND 
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Cleaners can view bookings for assigned properties (read-only)
CREATE POLICY "Cleaners can view bookings for assigned properties" ON bookings
    FOR SELECT USING (
        is_cleaner() AND 
        property_id IN (SELECT property_id FROM get_cleaner_properties())
    );

-- =============================================
-- CLEANINGS POLICIES
-- =============================================

-- Hosts can manage all cleaning tasks for their properties
CREATE POLICY "Hosts can manage cleanings for own properties" ON cleanings
    FOR ALL USING (
        is_host() AND 
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Cleaners can view and update cleaning tasks assigned to them or their properties
CREATE POLICY "Cleaners can manage assigned cleaning tasks" ON cleanings
    FOR SELECT USING (
        is_cleaner() AND (
            -- Assigned directly to cleaner
            assigned_to = auth.uid() OR
            -- Property they have access to
            property_id IN (SELECT property_id FROM get_cleaner_properties())
        )
    );

-- Cleaners can update status of cleaning tasks assigned to them
CREATE POLICY "Cleaners can update assigned cleaning status" ON cleanings
    FOR UPDATE USING (
        is_cleaner() AND (
            assigned_to = auth.uid() OR
            property_id IN (SELECT property_id FROM get_cleaner_properties())
        )
    )
    WITH CHECK (
        is_cleaner() AND (
            assigned_to = auth.uid() OR
            property_id IN (SELECT property_id FROM get_cleaner_properties())
        )
    );

-- =============================================
-- PROPERTY_ASSIGNMENTS POLICIES
-- =============================================

-- Hosts can manage property assignments for their properties
CREATE POLICY "Hosts can manage property assignments" ON property_assignments
    FOR ALL USING (
        is_host() AND 
        property_id IN (
            SELECT id FROM properties WHERE host_id = auth.uid()
        )
    );

-- Cleaners can view their own assignments
CREATE POLICY "Cleaners can view own assignments" ON property_assignments
    FOR SELECT USING (is_cleaner() AND cleaner_id = auth.uid());

-- =============================================
-- SCHEDULED_EMAILS POLICIES
-- =============================================

-- Hosts can manage emails for their bookings
CREATE POLICY "Hosts can manage emails for own bookings" ON scheduled_emails
    FOR ALL USING (
        is_host() AND 
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.host_id = auth.uid()
        )
    );

-- System can insert emails (for automated scheduling)
CREATE POLICY "System can insert scheduled emails" ON scheduled_emails
    FOR INSERT WITH CHECK (true);

-- =============================================
-- AUDIT_LOG POLICIES
-- =============================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_log
    FOR SELECT USING (user_id = auth.uid());

-- Hosts can view audit logs for their data
CREATE POLICY "Hosts can view relevant audit logs" ON audit_log
    FOR SELECT USING (
        is_host() AND (
            user_id = auth.uid() OR
            (table_name = 'properties' AND record_id IN (
                SELECT id FROM properties WHERE host_id = auth.uid()
            )) OR
            (table_name = 'bookings' AND record_id IN (
                SELECT b.id FROM bookings b
                JOIN properties p ON b.property_id = p.id
                WHERE p.host_id = auth.uid()
            ))
        )
    );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_log
    FOR INSERT WITH CHECK (true);

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View for host dashboard data
CREATE VIEW host_dashboard AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    COUNT(DISTINCT b.id) as total_bookings,
    COUNT(DISTINCT CASE WHEN b.status = 'confirmed' THEN b.id END) as confirmed_bookings,
    COUNT(DISTINCT c.id) as total_cleanings,
    COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_cleanings,
    COALESCE(SUM(b.total_amount), 0) as total_revenue
FROM properties p
LEFT JOIN bookings b ON p.id = b.property_id
LEFT JOIN cleanings c ON p.id = c.property_id
WHERE p.host_id = auth.uid()
GROUP BY p.id, p.name;

-- View for cleaner dashboard data
CREATE VIEW cleaner_dashboard AS
SELECT 
    p.id as property_id,
    p.name as property_name,
    p.address as property_address,
    COUNT(DISTINCT c.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN c.status = 'pending' THEN c.id END) as pending_tasks,
    COUNT(DISTINCT CASE WHEN c.status = 'in_progress' THEN c.id END) as in_progress_tasks,
    COUNT(DISTINCT CASE WHEN c.status = 'completed' THEN c.id END) as completed_tasks
FROM properties p
JOIN property_assignments pa ON p.id = pa.property_id
LEFT JOIN cleanings c ON p.id = c.property_id AND (c.assigned_to = auth.uid() OR c.assigned_to IS NULL)
WHERE pa.cleaner_id = auth.uid() AND pa.is_active = true
GROUP BY p.id, p.name, p.address;

-- Enable RLS on views
ALTER VIEW host_dashboard SET (security_barrier = true);
ALTER VIEW cleaner_dashboard SET (security_barrier = true);

-- =============================================
-- SECURITY FUNCTIONS
-- =============================================

-- Function to assign cleaner to property (host only)
CREATE OR REPLACE FUNCTION assign_cleaner_to_property(
    property_uuid UUID,
    cleaner_uuid UUID,
    assignment_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    host_owns_property BOOLEAN;
    cleaner_exists BOOLEAN;
BEGIN
    -- Check if current user is host and owns the property
    SELECT EXISTS(
        SELECT 1 FROM properties 
        WHERE id = property_uuid AND host_id = auth.uid()
    ) INTO host_owns_property;
    
    IF NOT host_owns_property THEN
        RAISE EXCEPTION 'Access denied: You do not own this property';
    END IF;
    
    -- Check if cleaner exists and has cleaner role
    SELECT EXISTS(
        SELECT 1 FROM user_profiles 
        WHERE id = cleaner_uuid AND role IN ('cleaner', 'admin') AND is_active = true
    ) INTO cleaner_exists;
    
    IF NOT cleaner_exists THEN
        RAISE EXCEPTION 'Invalid cleaner: User does not exist or is not an active cleaner';
    END IF;
    
    -- Insert or update assignment
    INSERT INTO property_assignments (property_id, cleaner_id, assigned_by, notes)
    VALUES (property_uuid, cleaner_uuid, auth.uid(), assignment_notes)
    ON CONFLICT (property_id, cleaner_id, is_active)
    DO UPDATE SET 
        is_active = true,
        notes = assignment_notes,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove cleaner from property (host only)
CREATE OR REPLACE FUNCTION remove_cleaner_from_property(
    property_uuid UUID,
    cleaner_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if current user is host and owns the property
    IF NOT EXISTS(
        SELECT 1 FROM properties 
        WHERE id = property_uuid AND host_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not own this property';
    END IF;
    
    -- Deactivate assignment
    UPDATE property_assignments 
    SET is_active = false, updated_at = NOW()
    WHERE property_id = property_uuid 
    AND cleaner_id = cleaner_uuid
    AND is_active = true;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update cleaning task status (cleaner only)
CREATE OR REPLACE FUNCTION update_cleaning_status(
    cleaning_uuid UUID,
    new_status VARCHAR(20),
    completion_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    can_update BOOLEAN := false;
BEGIN
    -- Check if cleaner can update this cleaning task
    SELECT (
        -- Directly assigned to cleaner
        assigned_to = auth.uid() OR
        -- Property they have access to
        property_id IN (SELECT property_id FROM get_cleaner_properties())
    ) INTO can_update
    FROM cleanings
    WHERE id = cleaning_uuid;
    
    IF NOT can_update THEN
        RAISE EXCEPTION 'Access denied: You cannot update this cleaning task';
    END IF;
    
    -- Validate status
    IF new_status NOT IN ('pending', 'in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', new_status;
    END IF;
    
    -- Update cleaning task
    UPDATE cleanings 
    SET 
        status = new_status,
        notes = COALESCE(completion_notes, notes),
        completed_at = CASE WHEN new_status = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = cleaning_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Create sample roles if needed (for testing)
-- INSERT INTO user_profiles (id, email, full_name, role) VALUES
-- ('host-uuid-here', 'host@example.com', 'Property Host', 'host'),
-- ('cleaner-uuid-here', 'cleaner@example.com', 'House Cleaner', 'cleaner')
-- ON CONFLICT (id) DO NOTHING;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;