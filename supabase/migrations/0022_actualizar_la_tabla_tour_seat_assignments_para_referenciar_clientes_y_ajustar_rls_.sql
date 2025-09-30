-- Deshabilitar RLS temporalmente para modificar la tabla
ALTER TABLE public.tour_seat_assignments DISABLE ROW LEVEL SECURITY;

-- Eliminar la restricción de clave externa existente si apunta a auth.users
ALTER TABLE public.tour_seat_assignments
DROP CONSTRAINT IF EXISTS tour_seat_assignments_user_id_fkey;

-- Renombrar la columna user_id a client_id
ALTER TABLE public.tour_seat_assignments
RENAME COLUMN user_id TO client_id;

-- Añadir la nueva restricción de clave externa que apunta a public.clients(id)
ALTER TABLE public.tour_seat_assignments
ADD CONSTRAINT tour_seat_assignments_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;

-- Eliminar políticas de RLS antiguas que puedan referenciar user_id
DROP POLICY IF EXISTS "Authenticated users can view seat assignments" ON public.tour_seat_assignments;
DROP POLICY IF EXISTS "Public can view seat assignments" ON public.tour_seat_assignments;
DROP POLICY IF EXISTS "Admins can manage seat assignments" ON public.tour_seat_assignments;

-- Habilitar RLS de nuevo
ALTER TABLE public.tour_seat_assignments ENABLE ROW LEVEL SECURITY;

-- Crear políticas de RLS actualizadas
-- Los administradores pueden gestionar todas las asignaciones de asientos
CREATE POLICY "Admins can manage all seat assignments" ON public.tour_seat_assignments
FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))) WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE (profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)));

-- Los clientes pueden ver sus propias asignaciones de asientos (si están vinculados a un cliente que a su vez está vinculado al usuario autenticado)
CREATE POLICY "Clients can view their own seat assignments" ON public.tour_seat_assignments
FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM clients WHERE (clients.id = client_id) AND (clients.user_id = auth.uid())));

-- Acceso de lectura público para asignaciones de asientos (para la página de detalles del tour)
CREATE POLICY "Public read access for seat assignments" ON public.tour_seat_assignments
FOR SELECT USING (true);