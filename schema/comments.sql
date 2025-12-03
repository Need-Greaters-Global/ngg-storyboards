-- NGG Storyboards - Comments Schema
-- Run this against the existing neondb database

-- Comments table for storyboard feedback
CREATE TABLE IF NOT EXISTS storyboard_comments (
    id SERIAL PRIMARY KEY,

    -- Storyboard identification
    client_slug VARCHAR(100) NOT NULL,          -- e.g., 'regentx'
    project_slug VARCHAR(100) NOT NULL,         -- e.g., 'summit-video-2025'
    scene_number INTEGER,                        -- NULL for general comments

    -- Comment details
    author_name VARCHAR(255) NOT NULL,
    author_email VARCHAR(255),
    comment_text TEXT NOT NULL,

    -- Status tracking
    status VARCHAR(50) DEFAULT 'pending',       -- pending, reviewed, resolved, archived
    team_response TEXT,                          -- NGG team can respond

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_storyboard
    ON storyboard_comments(client_slug, project_slug);
CREATE INDEX IF NOT EXISTS idx_comments_scene
    ON storyboard_comments(client_slug, project_slug, scene_number);
CREATE INDEX IF NOT EXISTS idx_comments_status
    ON storyboard_comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created
    ON storyboard_comments(created_at DESC);

-- Password/access control table (for per-client passwords)
CREATE TABLE IF NOT EXISTS storyboard_access (
    id SERIAL PRIMARY KEY,
    client_slug VARCHAR(100) NOT NULL,
    project_slug VARCHAR(100),                   -- NULL = all projects for this client
    password_hash VARCHAR(255) NOT NULL,         -- bcrypt hash
    description VARCHAR(255),                    -- e.g., 'RegenTx team access'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,         -- Optional expiration
    UNIQUE(client_slug, project_slug)
);

-- View for easy comment retrieval with scene context
CREATE OR REPLACE VIEW storyboard_comments_view AS
SELECT
    c.*,
    CONCAT(c.client_slug, '/', c.project_slug) as storyboard_path,
    CASE
        WHEN c.scene_number IS NULL THEN 'General'
        ELSE CONCAT('Scene ', c.scene_number)
    END as scene_label
FROM storyboard_comments c
ORDER BY c.created_at DESC;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_comment_timestamp_trigger ON storyboard_comments;
CREATE TRIGGER update_comment_timestamp_trigger
    BEFORE UPDATE ON storyboard_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_timestamp();
