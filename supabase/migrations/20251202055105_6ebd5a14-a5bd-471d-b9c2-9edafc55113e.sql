-- Add target_date column to profiles table
ALTER TABLE public.profiles
ADD COLUMN target_date DATE;

COMMENT ON COLUMN public.profiles.target_date IS 'Target date for reaching the goal weight';