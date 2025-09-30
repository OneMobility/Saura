ALTER TABLE public.clients
ADD COLUMN extra_services JSONB DEFAULT '[]'::jsonb;