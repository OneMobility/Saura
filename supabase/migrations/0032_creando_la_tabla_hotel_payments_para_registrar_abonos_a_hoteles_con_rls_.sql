-- Create hotel_payments table
CREATE TABLE public.hotel_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.hotel_payments ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "Admins can manage all hotel payments" ON public.hotel_payments 
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin')) )) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin')) ));