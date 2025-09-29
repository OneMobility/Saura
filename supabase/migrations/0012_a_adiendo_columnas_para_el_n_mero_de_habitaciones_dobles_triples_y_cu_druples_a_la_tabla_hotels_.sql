ALTER TABLE public.hotels
ADD COLUMN num_double_rooms INTEGER DEFAULT 0,
ADD COLUMN num_triple_rooms INTEGER DEFAULT 0,
ADD COLUMN num_quad_rooms INTEGER DEFAULT 0;