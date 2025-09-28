-- Create seo_settings table
CREATE TABLE public.seo_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_name TEXT NOT NULL UNIQUE,
  meta_title TEXT,
  meta_description TEXT,
  keywords TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Policies for seo_settings (admin can manage, public can read)
CREATE POLICY "Allow authenticated users to manage seo_settings" ON public.seo_settings
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow public read access to seo_settings" ON public.seo_settings
FOR SELECT USING (true);