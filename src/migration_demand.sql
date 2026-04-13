-- 1. Create demand_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS demand_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id),
    report_period TEXT NOT NULL,
    class_group TEXT NOT NULL, -- 'PRIMARY' or 'UPPER_PRIMARY'
    working_days INTEGER NOT NULL,
    enrollment_count INTEGER NOT NULL,
    report_data JSONB NOT NULL,
    standard_group TEXT, -- Standardized scoping field
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add standard_group column if only class_group existed
-- (Safeguard for consistent naming across tables)
ALTER TABLE demand_reports ADD COLUMN IF NOT EXISTS standard_group TEXT;

-- 3. Data migration for legacy records
UPDATE demand_reports SET standard_group = LOWER(class_group) WHERE standard_group IS NULL;

-- 4. Unique index for faster lookups
CREATE INDEX IF NOT EXISTS idx_demand_scoped ON demand_reports(teacher_id, report_period, standard_group);
