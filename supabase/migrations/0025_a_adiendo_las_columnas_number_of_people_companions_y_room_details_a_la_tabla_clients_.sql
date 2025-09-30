ALTER TABLE public.clients
ADD COLUMN number_of_people INTEGER NOT NULL DEFAULT 1,
ADD COLUMN companions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN room_details JSONB DEFAULT '{}'::jsonb;

-- Actualizar filas existentes para asegurar que la restricción NOT NULL para number_of_people se cumpla
UPDATE public.clients
SET number_of_people = 1
WHERE number_of_people IS NULL;