-- Sample Data for Bloom RAG System
-- Run this in your Supabase SQL Editor after running the schema

-- Insert sample organization and workspace
INSERT INTO organizations (id, name) VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corp');
INSERT INTO workspaces (id, organization_id, name) VALUES ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Policy Research');
INSERT INTO users (id, email, name) VALUES ('550e8400-e29b-41d4-a716-446655440002', 'john.doe@example.com', 'John Doe');
INSERT INTO workspace_members (user_id, workspace_id, role) VALUES ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'admin');

-- Insert sample documents
INSERT INTO documents (id, workspace_id, owner_id, title, storage_path, status, acl) VALUES 
('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Data Retention Policy 2024.pdf', 'documents/data-retention-policy.pdf', 'ready', 'workspace'),
('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'GDPR Compliance Guide.docx', 'documents/gdpr-guide.docx', 'ready', 'workspace'),
('550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Security Best Practices.pdf', 'documents/security-practices.pdf', 'ready', 'organization'),
('550e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Employee Handbook 2024.docx', 'documents/employee-handbook.docx', 'processing', 'workspace'),
('550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Marketing Strategy.pptx', 'documents/marketing-strategy.pptx', 'uploading', 'workspace'),
('550e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Failed Upload Document.pdf', 'documents/failed-upload.pdf', 'failed', 'workspace');

-- Update the failed document with an error message
UPDATE documents SET error = 'Upload failed due to network timeout' WHERE id = '550e8400-e29b-41d4-a716-446655440008';
