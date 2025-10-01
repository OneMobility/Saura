-- Create provider_payments table
CREATE TABLE public.provider_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.provider_payments ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "Admins can manage all provider payments" ON public.provider_payments 
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin')) )) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin')) ));