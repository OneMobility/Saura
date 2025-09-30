-- Create agency_settings table
CREATE TABLE public.agency_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name TEXT NOT NULL,
  agency_phone TEXT,
  agency_email TEXT,
  agency_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (admins) to insert agency settings
CREATE POLICY "Admins can insert agency settings" ON public.agency_settings
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Allow authenticated users (admins) to update agency settings
CREATE POLICY "Admins can update agency settings" ON public.agency_settings
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Allow public read access to agency settings (for booking sheet generation)
CREATE POLICY "Public read access for agency settings" ON public.agency_settings
FOR SELECT USING (true);

-- No delete policy needed for agency settings, as it's a single configuration.