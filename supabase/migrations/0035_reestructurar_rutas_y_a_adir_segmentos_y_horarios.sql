-- supabase/migrations/0035_reestructurar_rutas_y_a_adir_segmentos_y_horarios.sql

-- 1. Modificar la tabla bus_routes
-- Eliminar la política RLS existente para evitar conflictos durante la modificación de la tabla
DROP POLICY IF EXISTS "Admins can manage all bus routes" ON public.bus_routes;

-- Eliminar columnas antiguas si existen
ALTER TABLE public.bus_routes
DROP COLUMN IF EXISTS origin_destination_id,
DROP COLUMN IF EXISTS destinations,
DROP COLUMN IF EXISTS adult_price_per_seat,
DROP COLUMN IF EXISTS child_price_per_seat;

-- Añadir nuevas columnas a bus_routes
ALTER TABLE public.bus_routes
ADD COLUMN IF NOT EXISTS all_stops JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Re-habilitar RLS y recrear la política para administradores
ALTER TABLE public.bus_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all bus routes" ON public.bus_routes
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));


-- 2. Crear la nueva tabla route_segments
CREATE TABLE public.route_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.bus_routes(id) ON DELETE CASCADE NOT NULL,
  start_destination_id UUID REFERENCES public.bus_destinations(id) ON DELETE RESTRICT NOT NULL,
  end_destination_id UUID REFERENCES public.bus_destinations(id) ON DELETE RESTRICT NOT NULL,
  adult_price NUMERIC NOT NULL DEFAULT 0,
  child_price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  distance_km NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para route_segments
ALTER TABLE public.route_segments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para route_segments (solo admins pueden gestionar)
CREATE POLICY "Admins can manage route segments" ON public.route_segments
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));
-- Public read access for route segments (needed for public bus ticket search)
CREATE POLICY "Public read access for route segments" ON public.route_segments
FOR SELECT USING (true);


-- 3. Crear la nueva tabla bus_schedules
CREATE TABLE public.bus_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  route_id UUID REFERENCES public.bus_routes(id) ON DELETE CASCADE NOT NULL,
  departure_time TIME NOT NULL,
  day_of_week INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[], -- Array of integers (0=Sun, 1=Mon, ..., 6=Sat)
  effective_date_start DATE,
  effective_date_end DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para bus_schedules
ALTER TABLE public.bus_schedules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bus_schedules (solo admins pueden gestionar)
CREATE POLICY "Admins can manage bus schedules" ON public.bus_schedules
FOR ALL TO authenticated USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))) WITH CHECK (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))));
-- Public read access for bus schedules (needed for public bus ticket search)
CREATE POLICY "Public read access for bus schedules" ON public.bus_schedules
FOR SELECT USING (true);