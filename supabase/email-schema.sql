-- =============================================
-- SCHEDULED EMAILS TABLE
-- =============================================
CREATE TABLE scheduled_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL CHECK (email_type IN ('check_in_instructions', 'checkout_reminder', 'thank_you_review')),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_scheduled_emails_booking_id ON scheduled_emails(booking_id);
CREATE INDEX idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX idx_scheduled_emails_scheduled_for ON scheduled_emails(scheduled_for);
CREATE INDEX idx_scheduled_emails_type ON scheduled_emails(email_type);
CREATE INDEX idx_scheduled_emails_pending_due ON scheduled_emails(status, scheduled_for) WHERE status = 'pending';

-- =============================================
-- EMAIL TEMPLATES TABLE (Optional - for dynamic templates)
-- =============================================
CREATE TABLE email_templates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    template_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    variables JSONB, -- Store template variables and their descriptions
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, html_content, text_content, variables) VALUES 
(
    'check_in_instructions',
    'Check-in Instructions',
    'Check-in Instructions for {{property_name}} - {{check_in_date}}',
    '<h1>Welcome to {{property_name}}!</h1><p>Your check-in instructions...</p>',
    'Welcome to {{property_name}}! Your check-in instructions...',
    '{"property_name": "Property name", "check_in_date": "Check-in date", "guest_name": "Guest name", "property_address": "Property address"}'
),
(
    'checkout_reminder', 
    'Checkout Reminder',
    'Checkout Reminder - {{property_name}} Tomorrow',
    '<h1>Checkout Reminder</h1><p>Your checkout is tomorrow...</p>',
    'Checkout Reminder: Your checkout is tomorrow...',
    '{"property_name": "Property name", "checkout_date": "Checkout date", "guest_name": "Guest name"}'
),
(
    'thank_you_review',
    'Thank You and Review Request',
    'Thank you for staying at {{property_name}}! 🌟',
    '<h1>Thank you for your stay!</h1><p>We hope you enjoyed...</p>',
    'Thank you for your stay! We hope you enjoyed...',
    '{"property_name": "Property name", "guest_name": "Guest name", "review_link": "Review platform link"}'
);

-- =============================================
-- EMAIL LOGS TABLE (Optional - for detailed tracking)
-- =============================================
CREATE TABLE email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scheduled_email_id UUID REFERENCES scheduled_emails(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    email_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'bounced', 'opened', 'clicked')),
    provider_message_id VARCHAR(255), -- Message ID from email provider
    error_details JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for email logs
CREATE INDEX idx_email_logs_scheduled_email_id ON email_logs(scheduled_email_id);
CREATE INDEX idx_email_logs_booking_id ON email_logs(booking_id);
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at);

-- =============================================
-- TRIGGERS AND FUNCTIONS
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_email_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for scheduled_emails
CREATE TRIGGER trigger_update_scheduled_emails_timestamp
    BEFORE UPDATE ON scheduled_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_email_timestamps();

-- Trigger for email_templates
CREATE TRIGGER trigger_update_email_templates_timestamp
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_email_timestamps();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_emails
CREATE POLICY "Users can view their own booking emails" ON scheduled_emails
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.host_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own booking emails" ON scheduled_emails
    FOR UPDATE USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.host_id = auth.uid()
        )
    );

CREATE POLICY "System can insert scheduled emails" ON scheduled_emails
    FOR INSERT WITH CHECK (true);

-- Policies for email_templates (read-only for users)
CREATE POLICY "Users can view email templates" ON email_templates
    FOR SELECT USING (is_active = true);

-- Policies for email_logs
CREATE POLICY "Users can view their own email logs" ON email_logs
    FOR SELECT USING (
        booking_id IN (
            SELECT b.id FROM bookings b
            JOIN properties p ON b.property_id = p.id
            WHERE p.host_id = auth.uid()
        )
    );

CREATE POLICY "System can insert email logs" ON email_logs
    FOR INSERT WITH CHECK (true);

-- =============================================
-- UTILITY FUNCTIONS
-- =============================================

-- Function to schedule emails for a new booking
CREATE OR REPLACE FUNCTION schedule_booking_emails(
    p_booking_id UUID,
    p_guest_email VARCHAR(255),
    p_guest_name VARCHAR(255),
    p_check_in TIMESTAMP WITH TIME ZONE,
    p_check_out TIMESTAMP WITH TIME ZONE
)
RETURNS INTEGER AS $$
DECLARE
    emails_scheduled INTEGER := 0;
    check_in_email_date TIMESTAMP WITH TIME ZONE;
    checkout_reminder_date TIMESTAMP WITH TIME ZONE;
    thank_you_email_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate email send dates
    check_in_email_date := p_check_in - INTERVAL '2 days';
    checkout_reminder_date := p_check_out - INTERVAL '1 day';
    thank_you_email_date := p_check_out + INTERVAL '2 days';
    
    -- Schedule check-in instructions (only if in future)
    IF check_in_email_date > NOW() THEN
        INSERT INTO scheduled_emails (
            booking_id, email_type, recipient_email, recipient_name, scheduled_for
        ) VALUES (
            p_booking_id, 'check_in_instructions', p_guest_email, p_guest_name, check_in_email_date
        );
        emails_scheduled := emails_scheduled + 1;
    END IF;
    
    -- Schedule checkout reminder (only if in future)
    IF checkout_reminder_date > NOW() THEN
        INSERT INTO scheduled_emails (
            booking_id, email_type, recipient_email, recipient_name, scheduled_for
        ) VALUES (
            p_booking_id, 'checkout_reminder', p_guest_email, p_guest_name, checkout_reminder_date
        );
        emails_scheduled := emails_scheduled + 1;
    END IF;
    
    -- Schedule thank you email (always schedule, even if in past - it will be processed immediately)
    INSERT INTO scheduled_emails (
        booking_id, email_type, recipient_email, recipient_name, scheduled_for
    ) VALUES (
        p_booking_id, 'thank_you_review', p_guest_email, p_guest_name, thank_you_email_date
    );
    emails_scheduled := emails_scheduled + 1;
    
    RETURN emails_scheduled;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel emails for a booking
CREATE OR REPLACE FUNCTION cancel_booking_emails(p_booking_id UUID)
RETURNS INTEGER AS $$
DECLARE
    cancelled_count INTEGER;
BEGIN
    UPDATE scheduled_emails 
    SET status = 'cancelled', updated_at = NOW()
    WHERE booking_id = p_booking_id AND status = 'pending';
    
    GET DIAGNOSTICS cancelled_count = ROW_COUNT;
    RETURN cancelled_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- View for email statistics
CREATE VIEW email_stats AS
SELECT 
    email_type,
    status,
    COUNT(*) as count,
    DATE_TRUNC('day', created_at) as date
FROM scheduled_emails 
GROUP BY email_type, status, DATE_TRUNC('day', created_at)
ORDER BY date DESC, email_type, status;

-- View for pending emails due for sending
CREATE VIEW pending_emails_due AS
SELECT 
    se.*,
    b.guest_name,
    b.check_in,
    b.check_out,
    b.notes,
    b.booking_platform,
    p.name as property_name,
    p.address as property_address
FROM scheduled_emails se
JOIN bookings b ON se.booking_id = b.id
JOIN properties p ON b.property_id = p.id
WHERE se.status = 'pending' 
    AND se.scheduled_for <= NOW()
ORDER BY se.scheduled_for ASC;

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Insert sample scheduled emails (only run in development)
-- INSERT INTO scheduled_emails (booking_id, email_type, recipient_email, recipient_name, scheduled_for, status)
-- SELECT 
--     b.id,
--     'check_in_instructions',
--     'test@example.com',
--     b.guest_name,
--     b.check_in - INTERVAL '2 days',
--     'pending'
-- FROM bookings b
-- WHERE b.contact_email IS NOT NULL
-- LIMIT 3;