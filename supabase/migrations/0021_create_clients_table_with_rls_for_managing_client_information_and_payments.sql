-- Create clients table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Optional link to auth.users
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  contract_number TEXT UNIQUE, -- Optional, for manual contract numbers
  tour_id UUID REFERENCES public.tours(id) ON DELETE SET NULL, -- Link to the booked tour
  total_amount NUMERIC DEFAULT 0 NOT NULL,
  advance_payment NUMERIC DEFAULT 0 NOT NULL,
  total_paid NUMERIC DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL, -- e.g., 'pending', 'confirmed', 'completed', 'cancelled'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies for administrators (full access)
CREATE POLICY "Admins can manage all clients" ON public.clients
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Policy for authenticated users (clients) to view/update their own record
CREATE POLICY "Clients can view their own record" ON public.clients
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own record" ON public.clients
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);