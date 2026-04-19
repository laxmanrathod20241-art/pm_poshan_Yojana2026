-- Migration: Add payment_receipts table
-- Objective: Track funds received from the government for PM-POSHAN

CREATE TABLE IF NOT EXISTS public.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receipt_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policies for teacher-based isolation
CREATE POLICY "Teachers can view their own receipts" 
ON public.payment_receipts FOR SELECT 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own receipts" 
ON public.payment_receipts FOR INSERT 
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own receipts" 
ON public.payment_receipts FOR UPDATE 
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own receipts" 
ON public.payment_receipts FOR DELETE 
USING (auth.uid() = teacher_id);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_payment_receipts_teacher_id ON public.payment_receipts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_date ON public.payment_receipts(receipt_date);
