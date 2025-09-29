ALTER TABLE public.tours
ADD COLUMN selling_price_double_occupancy NUMERIC DEFAULT 0,
ADD COLUMN selling_price_triple_occupancy NUMERIC DEFAULT 0,
ADD COLUMN selling_price_quad_occupancy NUMERIC DEFAULT 0;

-- Optional: Update existing rows to set a default value for the new columns
UPDATE public.tours
SET
  selling_price_double_occupancy = selling_price_per_person,
  selling_price_triple_occupancy = selling_price_per_person,
  selling_price_quad_occupancy = selling_price_per_person
WHERE selling_price_per_person IS NOT NULL;

-- Optional: Drop the old selling_price_per_person column if no longer needed
-- ALTER TABLE public.tours DROP COLUMN selling_price_per_person;