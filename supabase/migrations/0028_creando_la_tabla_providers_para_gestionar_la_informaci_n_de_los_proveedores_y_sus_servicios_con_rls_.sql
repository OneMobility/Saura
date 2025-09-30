-- Create providers table
CREATE TABLE public.providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  service_type TEXT NOT NULL, -- e.g., 'lancha', 'guia', 'transporte_local', 'actividad'
  cost_per_unit NUMERIC DEFAULT 0 NOT NULL, -- Cost for the agency
  unit_type TEXT DEFAULT 'person' NOT NULL, -- e.g., 'person', 'group', 'hour', 'day'
  selling_price_per_unit NUMERIC DEFAULT 0 NOT NULL, -- Price to charge the client
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Policies for providers table
-- Admins can manage all providers
CREATE POLICY "Admins can manage all providers" ON public.providers
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));

-- Public read access for active providers
CREATE POLICY "Public read access for active providers" ON public.providers
FOR SELECT USING (is_active = TRUE);