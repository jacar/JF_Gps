-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'GPS JF Corp',
    company_email TEXT NOT NULL DEFAULT 'admin@gpsjf.com',
    company_phone TEXT NOT NULL DEFAULT '+51 999 999 999',
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    push_notifications BOOLEAN DEFAULT true,
    update_interval INTEGER DEFAULT 30,
    speed_limit INTEGER DEFAULT 100,
    geofence_alerts BOOLEAN DEFAULT true,
    default_zoom INTEGER DEFAULT 13,
    map_style TEXT DEFAULT 'streets',
    backup_frequency TEXT DEFAULT 'daily',
    retention_days INTEGER DEFAULT 90,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM settings);
