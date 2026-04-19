-- Create the financial_ledger_snapshots table
CREATE TABLE IF NOT EXISTS public.financial_ledger_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fiscal_year INTEGER NOT NULL,
    ledger_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(teacher_id, fiscal_year)
);

-- Enable Row Level Security
ALTER TABLE public.financial_ledger_snapshots ENABLE ROW LEVEL SECURITY;

-- Set up Policies
CREATE POLICY "Teachers can view their own ledger snapshots" 
ON public.financial_ledger_snapshots FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own ledger snapshots" 
ON public.financial_ledger_snapshots FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own ledger snapshots" 
ON public.financial_ledger_snapshots FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own ledger snapshots" 
ON public.financial_ledger_snapshots FOR DELETE 
USING (auth.uid() = teacher_id);

-- Create Indices
CREATE INDEX IF NOT EXISTS idx_ledger_snapshots_teacher_year ON public.financial_ledger_snapshots(teacher_id, fiscal_year);
