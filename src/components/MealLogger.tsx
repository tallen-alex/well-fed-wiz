import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Camera, Search, Sparkles, Plus, Utensils, Loader2 } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface IndianFood {
  id: string;
  food_name: string;
  category: string;
  common_serving_size: string;
  common_serving_calories: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface MealLoggerProps {
  onMealLogged?: () => void;
}

export function MealLogger({ onMealLogged }: MealLoggerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [foods, setFoods] = useState<IndianFood[]>([]);
  
  const [mealData, setMealData] = useState({
    meal_name: "",
    meal_type: "lunch",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    photo: null as File | null,
    photoPreview: null as string | null,
    notes: ""
  });

  const loadFoods = async (search: string = "") => {
    try {
      let query = supabase.from("indian_foods").select("*");
      
      if (search) {
        query = query.ilike("food_name", `%${search}%`);
      }
      
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setFoods(data || []);
    } catch (error: any) {
      console.error("Failed to load foods:", error);
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMealData(prev => ({
          ...prev,
          photo: file,
          photoPreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhoto = async () => {
    if (!mealData.photoPreview) return;
    
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-image', {
        body: { imageBase64: mealData.photoPreview }
      });

      if (error) throw error;

      if (data?.foods && data.foods.length > 0) {
        const food = data.foods[0];
        setMealData(prev => ({
          ...prev,
          meal_name: food.name,
          calories: food.calories?.toString() || "",
          protein: food.protein?.toFixed(1) || "",
          carbs: food.carbs?.toFixed(1) || "",
          fat: food.fat?.toFixed(1) || "",
          meal_type: food.meal_type || prev.meal_type
        }));

        toast({
          title: "Food Detected! 🎉",
          description: `Found ${food.name} with ${food.calories} calories`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze the food image",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const selectFood = (food: IndianFood) => {
    setMealData(prev => ({
      ...prev,
      meal_name: food.food_name,
      calories: food.common_serving_calories?.toString() || "",
      protein: food.protein_per_100g?.toFixed(1) || "",
      carbs: food.carbs_per_100g?.toFixed(1) || "",
      fat: food.fat_per_100g?.toFixed(1) || ""
    }));
    setSearchOpen(false);
  };

  const handleLogMeal = async () => {
    if (!mealData.meal_name || !mealData.meal_type) {
      toast({
        title: "Missing Information",
        description: "Please provide meal name and type",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("meal_logs").insert({
        user_id: user?.id,
        meal_name: mealData.meal_name,
        meal_type: mealData.meal_type,
        calories: mealData.calories ? parseInt(mealData.calories) : null,
        protein_grams: mealData.protein ? parseFloat(mealData.protein) : null,
        carbs_grams: mealData.carbs ? parseFloat(mealData.carbs) : null,
        fat_grams: mealData.fat ? parseFloat(mealData.fat) : null,
        notes: mealData.notes || null
      });

      if (error) throw error;

      toast({
        title: "Meal Logged! 🍽️",
        description: "Keep up the great tracking!",
      });

      // Reset form
      setMealData({
        meal_name: "",
        meal_type: "lunch",
        calories: "",
        protein: "",
        carbs: "",
        fat: "",
        photo: null,
        photoPreview: null,
        notes: ""
      });
      
      setIsOpen(false);
      onMealLogged?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log meal",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="lg"
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
      >
        <Plus className="h-5 w-5 mr-2" />
        Log a Meal
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Utensils className="h-6 w-6 text-primary" />
              Log Your Meal
            </DialogTitle>
            <DialogDescription>
              Snap a photo, search our database, or enter manually
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Photo Section */}
            <div className="space-y-3">
              <Label>Food Photo (Optional)</Label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {mealData.photoPreview ? "Change Photo" : "Take Photo"}
                </Button>
                
                {mealData.photoPreview && (
                  <Button
                    type="button"
                    onClick={analyzePhoto}
                    disabled={analyzing}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {analyzing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" /> AI Analyze</>
                    )}
                  </Button>
                )}
              </div>
              
              {mealData.photoPreview && (
                <div className="relative rounded-lg overflow-hidden border-2 border-primary/20">
                  <img
                    src={mealData.photoPreview}
                    alt="Food preview"
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>

            {/* Quick Search */}
            <div className="space-y-2">
              <Label>Quick Search Indian Foods</Label>
              <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-start"
                    onClick={() => loadFoods()}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {mealData.meal_name || "Search from 30+ common Indian dishes..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Search foods..."
                      onValueChange={(search) => loadFoods(search)}
                    />
                    <CommandEmpty>No food found.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {foods.map((food) => (
                        <CommandItem
                          key={food.id}
                          onSelect={() => selectFood(food)}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{food.food_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {food.common_serving_size} • {food.common_serving_calories} cal
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Manual Entry */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="meal_name">Meal Name *</Label>
                <Input
                  id="meal_name"
                  value={mealData.meal_name}
                  onChange={(e) => setMealData(prev => ({ ...prev, meal_name: e.target.value }))}
                  placeholder="e.g., Butter Chicken with Naan"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="meal_type">Meal Type *</Label>
                <Select value={mealData.meal_type} onValueChange={(value) => setMealData(prev => ({ ...prev, meal_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
                    <SelectItem value="lunch">☀️ Lunch</SelectItem>
                    <SelectItem value="dinner">🌙 Dinner</SelectItem>
                    <SelectItem value="snack">🍪 Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calories">Calories</Label>
                <Input
                  id="calories"
                  type="number"
                  value={mealData.calories}
                  onChange={(e) => setMealData(prev => ({ ...prev, calories: e.target.value }))}
                  placeholder="350"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="protein">Protein (g)</Label>
                <Input
                  id="protein"
                  type="number"
                  step="0.1"
                  value={mealData.protein}
                  onChange={(e) => setMealData(prev => ({ ...prev, protein: e.target.value }))}
                  placeholder="15.5"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carbs">Carbs (g)</Label>
                <Input
                  id="carbs"
                  type="number"
                  step="0.1"
                  value={mealData.carbs}
                  onChange={(e) => setMealData(prev => ({ ...prev, carbs: e.target.value }))}
                  placeholder="45.0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fat">Fat (g)</Label>
                <Input
                  id="fat"
                  type="number"
                  step="0.1"
                  value={mealData.fat}
                  onChange={(e) => setMealData(prev => ({ ...prev, fat: e.target.value }))}
                  placeholder="12.0"
                />
              </div>

              <div className="col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={mealData.notes}
                  onChange={(e) => setMealData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="How did you feel? Any thoughts..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLogMeal}
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Logging..." : "Log Meal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
