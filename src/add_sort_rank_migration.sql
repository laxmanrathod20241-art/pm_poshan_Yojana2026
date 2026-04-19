-- Add sort_rank column to menu_master table
ALTER TABLE menu_master ADD COLUMN IF NOT EXISTS sort_rank INTEGER DEFAULT 999;

-- Update existing items to have a default rank if needed, though DEFAULT 999 is set.
-- We can also try to auto-assign ranks based on name or created_at for initial order.
UPDATE menu_master SET sort_rank = 999 WHERE sort_rank IS NULL;
