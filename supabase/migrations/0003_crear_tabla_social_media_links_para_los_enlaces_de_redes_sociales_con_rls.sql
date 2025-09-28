-- Create social_media_links table
CREATE TABLE public.social_media_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.social_media_links ENABLE ROW LEVEL SECURITY;

-- Policies for social_media_links (admin can manage, public can read)
CREATE POLICY "Allow authenticated users to manage social_media_links" ON public.social_media_links
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Allow public read access to social_media_links" ON public.social_media_links
FOR SELECT USING (true);