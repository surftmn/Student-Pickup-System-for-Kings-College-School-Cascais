-- Enhanced Pickup Email Notifications Schema
-- This schema supports AI-powered email processing with Gemini

-- Drop existing tables if they exist (be careful in production!)
-- DROP TABLE IF EXISTS pickup_documents CASCADE;
-- DROP TABLE IF EXISTS pickup_email_notifications CASCADE;

-- Enhanced pickup email notifications table
CREATE TABLE pickup_email_notifications (
    id SERIAL PRIMARY KEY,
    email_id VARCHAR(255) UNIQUE NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    student_id INTEGER REFERENCES students(id),
    student_name VARCHAR(255) NOT NULL,
    student_class VARCHAR(100),
    pickup_time VARCHAR(50), -- Keeping as VARCHAR to handle various formats like "14:30" or "Not specified"
    pickup_person VARCHAR(255) NOT NULL,
    is_parent BOOLEAN DEFAULT true,
    requires_id_verification BOOLEAN DEFAULT false,
    reason TEXT,
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'medium', 'high', 'urgent')),
    confidence_level VARCHAR(20) DEFAULT 'medium' CHECK (confidence_level IN ('low', 'medium', 'high')),
    special_instructions TEXT,
    parent_email VARCHAR(255),
    parent_name VARCHAR(255),
    sender_email VARCHAR(255) NOT NULL,
    display_message TEXT NOT NULL,
    has_attachments BOOLEAN DEFAULT false,
    attachment_count INTEGER DEFAULT 0,
    needs_manual_review BOOLEAN DEFAULT false,
    review_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected')),
    original_subject TEXT,
    original_body TEXT,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    completed_at TIMESTAMP,
    approved_by VARCHAR(100), -- Admin user who approved
    notes TEXT, -- Admin notes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pickup documents table for storing ID cards and other attachments
CREATE TABLE pickup_documents (
    id SERIAL PRIMARY KEY,
    pickup_notification_id INTEGER REFERENCES pickup_email_notifications(id) ON DELETE CASCADE,
    email_id VARCHAR(255) NOT NULL,
    student_id INTEGER REFERENCES students(id),
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase storage
    file_url TEXT, -- Public URL for viewing
    mime_type VARCHAR(100),
    file_size INTEGER DEFAULT 0,
    is_identity_document BOOLEAN DEFAULT false,
    document_type VARCHAR(50), -- 'id_card', 'passport', 'driver_license', 'other', 'not_id'
    person_name_on_document VARCHAR(255), -- Name extracted from ID by Gemini
    analysis_confidence VARCHAR(20) DEFAULT 'low' CHECK (analysis_confidence IN ('low', 'medium', 'high')),
    appears_valid BOOLEAN DEFAULT false,
    analysis_result JSONB, -- Full Gemini analysis response
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(100), -- Admin who verified the document
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'needs_review')),
    verification_notes TEXT,
    verified_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_pickup_notifications_status ON pickup_email_notifications(status);
CREATE INDEX idx_pickup_notifications_priority ON pickup_email_notifications(priority_level);
CREATE INDEX idx_pickup_notifications_student ON pickup_email_notifications(student_id);
CREATE INDEX idx_pickup_notifications_created ON pickup_email_notifications(created_at);
CREATE INDEX idx_pickup_notifications_requires_id ON pickup_email_notifications(requires_id_verification);
CREATE INDEX idx_pickup_notifications_is_parent ON pickup_email_notifications(is_parent);

CREATE INDEX idx_pickup_documents_notification ON pickup_documents(pickup_notification_id);
CREATE INDEX idx_pickup_documents_student ON pickup_documents(student_id);
CREATE INDEX idx_pickup_documents_is_id ON pickup_documents(is_identity_document);
CREATE INDEX idx_pickup_documents_verification ON pickup_documents(verification_status);

-- Enable Row Level Security
ALTER TABLE pickup_email_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_documents ENABLE ROW LEVEL SECURITY;

-- Policies for pickup_email_notifications
CREATE POLICY "Admin can view all pickup notifications" ON pickup_email_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Monitor can view pickup notifications" ON pickup_email_notifications
    FOR SELECT USING (auth.jwt() ->> 'role' = 'monitor');

CREATE POLICY "Security can view and update pickup notifications" ON pickup_email_notifications
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'security'));

-- Policies for pickup_documents
CREATE POLICY "Admin can view all pickup documents" ON pickup_documents
    FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Monitor can view pickup documents" ON pickup_documents
    FOR SELECT USING (auth.jwt() ->> 'role' = 'monitor');

CREATE POLICY "Security can view pickup documents" ON pickup_documents
    FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'security'));

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_pickup_notifications_updated_at 
    BEFORE UPDATE ON pickup_email_notifications 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically link documents to notifications
CREATE OR REPLACE FUNCTION link_document_to_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to find matching pickup notification by email_id
    UPDATE pickup_documents 
    SET pickup_notification_id = (
        SELECT id FROM pickup_email_notifications 
        WHERE email_id = NEW.email_id 
        LIMIT 1
    )
    WHERE id = NEW.id AND pickup_notification_id IS NULL;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to link documents when they are inserted
CREATE TRIGGER link_document_trigger 
    AFTER INSERT ON pickup_documents 
    FOR EACH ROW 
    EXECUTE FUNCTION link_document_to_notification();

-- Create a view for easier querying of complete pickup information
CREATE VIEW pickup_notifications_complete AS
SELECT 
    pen.*,
    s.name as verified_student_name,
    s.class as verified_student_class,
    s.photo_url as student_photo_url,
    COUNT(pd.id) as document_count,
    COUNT(CASE WHEN pd.is_identity_document = true THEN 1 END) as id_document_count,
    COUNT(CASE WHEN pd.verification_status = 'verified' THEN 1 END) as verified_document_count,
    ARRAY_AGG(
        CASE WHEN pd.is_identity_document = true THEN
            jsonb_build_object(
                'id', pd.id,
                'filename', pd.filename,
                'file_url', pd.file_url,
                'document_type', pd.document_type,
                'person_name', pd.person_name_on_document,
                'appears_valid', pd.appears_valid,
                'verification_status', pd.verification_status
            )
        END
    ) FILTER (WHERE pd.is_identity_document = true) as identity_documents
FROM pickup_email_notifications pen
LEFT JOIN students s ON pen.student_id = s.id
LEFT JOIN pickup_documents pd ON pen.id = pd.pickup_notification_id
GROUP BY pen.id, s.name, s.class, s.photo_url;

-- Grant access to the view
GRANT SELECT ON pickup_notifications_complete TO authenticated;

-- Sample data for testing (optional)
/*
INSERT INTO pickup_email_notifications (
    email_id, message_id, student_name, pickup_time, pickup_person, 
    is_parent, requires_id_verification, reason, sender_email, display_message
) VALUES (
    'test-email-001', 'msg-001', 'Adrian Silva', '13:45', 'Francisco Silva', 
    false, true, 'Doctor appointment', 'parent@example.com', 
    'Adrian Silva (7C) will leave at 13:45 with: Francisco Silva ⚠️ NON-PARENT PICKUP - ID VERIFICATION REQUIRED. Reason: Doctor appointment'
);
*/ 