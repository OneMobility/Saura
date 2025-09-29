-- Crear la tabla 'tour_seat_assignments'
CREATE TABLE public.tour_seat_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tour_id UUID NOT NULL REFERENCES public.tours(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available', 'booked', 'blocked', 'courtesy'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Usuario que reservó el asiento
  booked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tour_id, seat_number) -- Asegura que no haya duplicados de asientos por tour
);

-- Habilitar RLS (REQUERIDO para seguridad)
ALTER TABLE public.tour_seat_assignments ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- Los usuarios autenticados pueden ver los asientos disponibles y su estado
CREATE POLICY "Authenticated users can view seat assignments" ON public.tour_seat_assignments
FOR SELECT TO authenticated USING (true);

-- Los usuarios anónimos también pueden ver los asientos disponibles (para selección pública)
CREATE POLICY "Public can view seat assignments" ON public.tour_seat_assignments
FOR SELECT USING (true);

-- Los administradores pueden insertar, actualizar y eliminar asignaciones de asientos
CREATE POLICY "Admins can manage seat assignments" ON public.tour_seat_assignments
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Opcional: Permitir a los usuarios reservar sus propios asientos (requiere lógica de aplicación)
-- CREATE POLICY "Users can book their own seats" ON public.tour_seat_assignments
-- FOR UPDATE TO authenticated USING (auth.uid() = user_id OR status = 'available') WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can insert their own seat bookings" ON public.tour_seat_assignments
-- FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);