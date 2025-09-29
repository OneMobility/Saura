-- Crear la tabla 'tours'
CREATE TABLE public.tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  full_content TEXT,
  duration TEXT NOT NULL,
  includes TEXT[],
  itinerary JSONB,
  bus_capacity INTEGER NOT NULL,
  bus_cost NUMERIC NOT NULL,
  courtesies INTEGER DEFAULT 0 NOT NULL,
  hotel_details JSONB, -- [{ name: 'Hotel A', cost: 500, capacity: 20 }]
  provider_details JSONB, -- [{ name: 'Transporte X', service: 'Autobús', cost: 300 }]
  total_base_cost NUMERIC, -- Suma de bus_cost, hotel_costs, provider_costs
  paying_clients_count INTEGER, -- bus_capacity - courtesies
  cost_per_paying_person NUMERIC, -- total_base_cost / paying_clients_count
  selling_price_per_person NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (REQUERIDO para seguridad)
ALTER TABLE public.tours ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- Permitir a los administradores seleccionar, insertar, actualizar y eliminar tours
CREATE POLICY "Admins can manage tours" ON public.tours
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Permitir acceso de lectura público a los tours (para la parte pública del sitio)
CREATE POLICY "Public read access for tours" ON public.tours
FOR SELECT USING (true);