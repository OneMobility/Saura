-- Crear la tabla 'buses'
CREATE TABLE public.buses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  license_plate TEXT,
  rental_cost NUMERIC NOT NULL DEFAULT 0,
  total_capacity INTEGER NOT NULL DEFAULT 0,
  seat_map_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (REQUERIDO para seguridad)
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para administradores
CREATE POLICY "Admins can view buses" ON public.buses
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can insert buses" ON public.buses
FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update buses" ON public.buses
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete buses" ON public.buses
FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));