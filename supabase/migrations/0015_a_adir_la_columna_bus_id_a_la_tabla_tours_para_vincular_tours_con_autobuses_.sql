ALTER TABLE public.tours
ADD COLUMN bus_id UUID REFERENCES public.buses(id) ON DELETE SET NULL;

-- Opcional: Crear una política para permitir a los administradores actualizar el bus_id
CREATE POLICY "Admins can update bus_id in tours" ON public.tours
FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));