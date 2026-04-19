-- 1. Add section_type column to payment_receipts
ALTER TABLE public.payment_receipts 
ADD COLUMN IF NOT EXISTS section_type TEXT DEFAULT 'primary';

-- 2. Add section_type column to financial_ledger_snapshots
ALTER TABLE public.financial_ledger_snapshots 
ADD COLUMN IF NOT EXISTS section_type TEXT DEFAULT 'primary';

-- 3. Update the unique constraint on snapshots to be section-aware
-- First, drop the old constraint if it exists (usually named table_name_teacher_id_fiscal_year_key)
ALTER TABLE public.financial_ledger_snapshots 
DROP CONSTRAINT IF EXISTS financial_ledger_snapshots_teacher_id_fiscal_year_key;

-- Create the new composite unique constraint
ALTER TABLE public.financial_ledger_snapshots 
ADD CONSTRAINT financial_ledger_snapshots_teacher_year_section_key 
UNIQUE (teacher_id, fiscal_year, section_type);

-- 4. Update indices for performance
DROP INDEX IF EXISTS idx_ledger_snapshots_teacher_year;
CREATE INDEX IF NOT EXISTS idx_ledger_snapshots_teacher_year_section 
ON public.financial_ledger_snapshots(teacher_id, fiscal_year, section_type);

-- 5. Add a check constraint to ensure only valid section types are used
ALTER TABLE public.payment_receipts 
ADD CONSTRAINT check_valid_section_type 
CHECK (section_type IN ('primary', 'upper_primary'));

ALTER TABLE public.financial_ledger_snapshots 
ADD CONSTRAINT check_valid_section_snapshot 
CHECK (section_type IN ('primary', 'upper_primary'));
