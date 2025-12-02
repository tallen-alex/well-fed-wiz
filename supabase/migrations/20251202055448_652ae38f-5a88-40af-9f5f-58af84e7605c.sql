-- Create meal_logs table
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories INTEGER,
  protein_grams NUMERIC(5,1),
  carbs_grams NUMERIC(5,1),
  fat_grams NUMERIC(5,1),
  photo_url TEXT,
  notes TEXT,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_time TIME NOT NULL DEFAULT CURRENT_TIME,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own meal logs"
ON public.meal_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs"
ON public.meal_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs"
ON public.meal_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs"
ON public.meal_logs FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all meal logs"
ON public.meal_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indian_foods database
CREATE TABLE public.indian_foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  calories_per_100g INTEGER NOT NULL,
  protein_per_100g NUMERIC(5,1),
  carbs_per_100g NUMERIC(5,1),
  fat_per_100g NUMERIC(5,1),
  common_serving_size TEXT,
  common_serving_calories INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public read)
ALTER TABLE public.indian_foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view indian foods"
ON public.indian_foods FOR SELECT
USING (true);

CREATE POLICY "Only admins can modify indian foods"
ON public.indian_foods FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster searches
CREATE INDEX idx_indian_foods_name ON public.indian_foods(food_name);
CREATE INDEX idx_meal_logs_user_date ON public.meal_logs(user_id, logged_date DESC);

-- Insert common Indian foods with calorie data
INSERT INTO public.indian_foods (food_name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, common_serving_size, common_serving_calories) VALUES
-- Rice & Breads
('Basmati Rice (cooked)', 'Grains', 130, 2.7, 28.0, 0.3, '1 cup (158g)', 205),
('Chapati/Roti', 'Breads', 297, 11.0, 52.0, 4.5, '1 piece (40g)', 119),
('Naan', 'Breads', 310, 9.0, 51.0, 7.0, '1 piece (90g)', 279),
('Paratha (plain)', 'Breads', 321, 6.9, 38.0, 15.0, '1 piece (60g)', 193),
('Puri', 'Breads', 501, 6.8, 42.0, 34.0, '1 piece (20g)', 100),
('Idli', 'Breakfast', 66, 2.1, 14.0, 0.4, '1 piece (50g)', 33),
('Dosa (plain)', 'Breakfast', 168, 3.9, 28.0, 3.7, '1 piece (60g)', 101),

-- Curries & Gravies
('Chicken Tikka Masala', 'Curry', 140, 12.0, 5.0, 8.0, '1 cup (240g)', 336),
('Butter Chicken', 'Curry', 160, 13.0, 6.0, 10.0, '1 cup (240g)', 384),
('Paneer Butter Masala', 'Curry', 180, 11.0, 8.0, 12.0, '1 cup (240g)', 432),
('Dal Tadka', 'Lentils', 105, 7.0, 17.0, 1.5, '1 cup (240g)', 252),
('Palak Paneer', 'Curry', 135, 9.0, 7.0, 8.0, '1 cup (240g)', 324),
('Aloo Gobi', 'Curry', 95, 2.5, 15.0, 2.5, '1 cup (200g)', 190),
('Chole (Chickpea Curry)', 'Curry', 120, 6.0, 18.0, 3.0, '1 cup (240g)', 288),
('Rajma', 'Lentils', 110, 7.5, 19.0, 0.5, '1 cup (240g)', 264),

-- Snacks & Appetizers
('Samosa', 'Snacks', 262, 3.5, 25.0, 17.0, '1 piece (50g)', 131),
('Pakora', 'Snacks', 280, 5.0, 22.0, 19.0, '1 cup (100g)', 280),
('Bhel Puri', 'Snacks', 180, 4.0, 32.0, 4.0, '1 cup (100g)', 180),
('Pani Puri', 'Snacks', 30, 1.0, 6.0, 0.5, '1 piece (15g)', 5),

-- Desserts
('Gulab Jamun', 'Desserts', 375, 4.0, 53.0, 15.0, '1 piece (40g)', 150),
('Jalebi', 'Desserts', 415, 1.5, 70.0, 13.0, '1 piece (30g)', 125),
('Kheer', 'Desserts', 130, 3.5, 21.0, 3.5, '1 cup (200g)', 260),
('Rasgulla', 'Desserts', 186, 4.0, 35.0, 3.5, '1 piece (50g)', 93),

-- Vegetables
('Baingan Bharta', 'Vegetables', 105, 2.0, 9.0, 7.0, '1 cup (200g)', 210),
('Bhindi Masala', 'Vegetables', 85, 2.5, 12.0, 3.0, '1 cup (180g)', 153),
('Mixed Vegetable Curry', 'Vegetables', 95, 3.0, 14.0, 3.5, '1 cup (200g)', 190),

-- Beverages
('Lassi (Sweet)', 'Beverages', 85, 3.0, 13.0, 2.5, '1 glass (250ml)', 213),
('Masala Chai', 'Beverages', 40, 1.5, 6.0, 1.5, '1 cup (200ml)', 80),

-- Biryani & Rice Dishes
('Chicken Biryani', 'Rice', 180, 11.0, 25.0, 4.5, '1 cup (200g)', 360),
('Veg Biryani', 'Rice', 150, 3.5, 28.0, 3.0, '1 cup (200g)', 300),
('Pulao', 'Rice', 140, 3.0, 26.0, 2.5, '1 cup (200g)', 280);