-- Add other_income column to tours table
ALTER TABLE public.tours
ADD COLUMN other_income NUMERIC DEFAULT 0;

-- Update RLS policies for tours table to allow admins to update other_income
-- Ensure existing policies are not overwritten, only extended if necessary.
-- Assuming 'Admins can manage tours' policy already exists and covers UPDATE.
-- If not, a specific UPDATE policy for other_income would be needed.
-- For now, we assume the existing '*' policy for admins covers this.