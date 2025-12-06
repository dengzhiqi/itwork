-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Migrate existing departments from staff table
INSERT OR IGNORE INTO departments (name)
SELECT DISTINCT department 
FROM staff 
WHERE department IS NOT NULL AND department != '' AND department != '[占位]';

-- Note: This migration should be run on the production database
-- Command: npx wrangler d1 execute itwork-db --remote --file=migrations/001_create_departments.sql
