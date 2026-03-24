-- Add payment_date and pg_id to payments table
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_date DATE,
  ADD COLUMN IF NOT EXISTS pg_id UUID REFERENCES public.pgs(id) ON DELETE SET NULL;

-- Backfill payment_date from created_at for existing records
UPDATE public.payments
SET payment_date = created_at::DATE
WHERE payment_date IS NULL;

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_payments_pg_id ON public.payments(pg_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);
