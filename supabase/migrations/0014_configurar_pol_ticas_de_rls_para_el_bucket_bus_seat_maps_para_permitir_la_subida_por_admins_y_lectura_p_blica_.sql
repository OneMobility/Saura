-- Permitir a los administradores subir imágenes al bucket 'bus-seat-maps'
CREATE POLICY "Admins can upload bus seat map images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'bus-seat-maps' AND EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
);

-- Permitir a los administradores actualizar imágenes en el bucket 'bus-seat-maps'
CREATE POLICY "Admins can update bus seat map images" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'bus-seat-maps' AND EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
);

-- Permitir a los administradores eliminar imágenes del bucket 'bus-seat-maps'
CREATE POLICY "Admins can delete bus seat map images" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'bus-seat-maps' AND EXISTS (SELECT 1 FROM public.profiles WHERE public.profiles.id = auth.uid() AND public.profiles.role = 'admin')
);

-- Permitir acceso de lectura público a las imágenes del bucket 'bus-seat-maps'
CREATE POLICY "Public read access for bus seat map images" ON storage.objects
FOR SELECT USING (bucket_id = 'bus-seat-maps');