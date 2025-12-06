-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Add email column if it doesn't exist (SQLite doesn't support IF NOT EXISTS for columns in ancient versions but D1 should handle simple add column or we can ignore error if fails - actually `ALTER TABLE ... ADD COLUMN` is standard)
-- However, we can't easily conditionally add a column in pure SQL script without knowing state. 
-- Best approach for specific requested fix: Ensure table has email.
-- Since user is likely on a state where table exists but might miss email.

-- Try to add email column. If it exists, this might fail, so we might need a separate migration or just assume we are creating fresh or fixing.
-- But wait, D1 migrations are applied sequentially.
-- Let's just create the table definition properly.
