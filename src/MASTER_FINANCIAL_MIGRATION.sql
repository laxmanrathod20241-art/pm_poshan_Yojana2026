-- ==========================================================
-- UPDATED MASTER FINANCIAL MIGRATION (With Table Upgrades)
-- Run this in Local Postgres SQL Editor to fix missing column errors
-- ==========================================================

-- 1. Ensure Table Payment Receipts exists and is upgraded
CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade step: Add section_type if it doesn't exist
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS section_type TEXT DEFAULT 'primary';
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS remarks TEXT;

-- 2. Ensure Table Financial Ledger Snapshots exists and is upgraded
CREATE TABLE IF NOT EXISTS public.financial_ledger_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    ledger_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Upgrade step: Add section_type and unique constraint
ALTER TABLE public.financial_ledger_snapshots ADD COLUMN IF NOT EXISTS section_type TEXT DEFAULT 'primary';

-- Re-apply Unique Constraint correctly
ALTER TABLE public.financial_ledger_snapshots 
DROP CONSTRAINT IF EXISTS financial_ledger_snapshots_teacher_id_fiscal_year_key;

ALTER TABLE public.financial_ledger_snapshots 
DROP CONSTRAINT IF EXISTS financial_ledger_snapshots_teacher_year_section_key;

ALTER TABLE public.financial_ledger_snapshots 
ADD CONSTRAINT financial_ledger_snapshots_teacher_year_section_key 
UNIQUE (teacher_id, fiscal_year, section_type);

-- 3. Security Policies
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_ledger_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage their own receipts" ON public.payment_receipts;
CREATE POLICY "Teachers can manage their own receipts" ON public.payment_receipts 
    FOR ALL USING (auth.uid() = teacher_id);

DROP POLICY IF EXISTS "Teachers can manage their own snapshots" ON public.financial_ledger_snapshots;
CREATE POLICY "Teachers can manage their own snapshots" ON public.financial_ledger_snapshots 
    FOR ALL USING (auth.uid() = teacher_id);

-- 4. Constraints
ALTER TABLE public.payment_receipts DROP CONSTRAINT IF EXISTS check_valid_section_type;
ALTER TABLE public.payment_receipts ADD CONSTRAINT check_valid_section_type CHECK (section_type IN ('primary', 'upper_primary'));

ALTER TABLE public.financial_ledger_snapshots DROP CONSTRAINT IF EXISTS check_valid_section_snapshot;
ALTER TABLE public.financial_ledger_snapshots ADD CONSTRAINT check_valid_section_snapshot CHECK (section_type IN ('primary', 'upper_primary'));

-- 5. Indices
CREATE INDEX IF NOT EXISTS idx_receipts_teacher ON public.payment_receipts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_lookup ON public.financial_ledger_snapshots(teacher_id, fiscal_year, section_type);
