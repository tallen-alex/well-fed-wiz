-- Add new columns to profiles for client health data
ALTER TABLE public.profiles
ADD COLUMN age INTEGER,
ADD COLUMN height_cm NUMERIC(5,2),
ADD COLUMN current_weight_kg NUMERIC(5,2),
ADD COLUMN target_weight_kg NUMERIC(5,2),
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Create weight history table for tracking progress
CREATE TABLE public.weight_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own weight history
CREATE POLICY "Users can view own weight history"
ON public.weight_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own weight records
CREATE POLICY "Users can insert own weight records"
ON public.weight_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all weight history
CREATE POLICY "Admins can view all weight history"
ON public.weight_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create index for better query performance
CREATE INDEX idx_weight_history_user_date ON public.weight_history(user_id, recorded_date DESC);