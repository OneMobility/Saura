-- Crear tabla hotels
CREATE TABLE public.hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  cost_per_night_double NUMERIC NOT NULL DEFAULT 0,
  cost_per_night_triple NUMERIC NOT NULL DEFAULT 0,
  cost_per_night_quad NUMERIC NOT NULL DEFAULT 0,
  capacity_double INTEGER NOT NULL DEFAULT 2,
  capacity_triple INTEGER NOT NULL DEFAULT 3,
  capacity_quad INTEGER NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (SEGURIDAD REQUERIDA)
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- Políticas para que solo los administradores puedan gestionar los hoteles
CREATE POLICY "Admins can manage hotels" ON public.hotels
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Política opcional: Acceso de lectura público para hoteles activos (si se necesita para el frontend)
CREATE POLICY "Public read access for active hotels" ON public.hotels
FOR SELECT USING (is_active = TRUE);