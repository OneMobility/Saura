-- Crear el bucket de almacenamiento 'tour-images'
INSERT INTO storage.buckets (id, name, public)
VALUES ('tour-images', 'tour-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en la tabla de objetos de almacenamiento
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política para permitir el acceso de lectura público a las imágenes de tours
CREATE POLICY "Allow public read access to tour images"
ON storage.objects FOR SELECT
USING (bucket_id = 'tour-images');

-- Política para permitir que los usuarios administradores autenticados gestionen las imágenes de tours
CREATE POLICY "Allow authenticated admin users to manage tour images"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'tour-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (bucket_id = 'tour-images' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));