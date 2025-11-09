-- Create table to track cleaning job emails
CREATE TABLE IF NOT EXISTS cleaning_email_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    cleaner_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    cleaner_email VARCHAR(255) NOT NULL,
    cleaner_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    email_content TEXT,
    cleaning_ids UUID[],
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed')),
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cleaning_email_logs_cleaner_id ON cleaning_email_logs(cleaner_id);
CREATE INDEX idx_cleaning_email_logs_cleaner_email ON cleaning_email_logs(cleaner_email);
CREATE INDEX idx_cleaning_email_logs_status ON cleaning_email_logs(status);
CREATE INDEX idx_cleaning_email_logs_sent_at ON cleaning_email_logs(sent_at);

-- Enable RLS
ALTER TABLE cleaning_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Hosts can view all cleaning email logs
CREATE POLICY "Hosts can view cleaning email logs" ON cleaning_email_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('host', 'admin')
        )
    );

-- RLS Policy: System can insert cleaning email logs
CREATE POLICY "System can insert cleaning email logs" ON cleaning_email_logs
    FOR INSERT WITH CHECK (true);

