-- Create customer_reviews table
CREATE TABLE public.customer_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  review_text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (anyone can see reviews)
CREATE POLICY "Public read access for customer reviews" ON public.customer_reviews
FOR SELECT USING (true);

-- Policy for admin insert (only admins can add reviews)
CREATE POLICY "Admins can insert customer reviews" ON public.customer_reviews
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy for admin update (only admins can update reviews)
CREATE POLICY "Admins can update customer reviews" ON public.customer_reviews
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy for admin delete (only admins can delete reviews)
CREATE POLICY "Admins can delete customer reviews" ON public.customer_reviews
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));