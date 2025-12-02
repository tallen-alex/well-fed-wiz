import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Utensils, Flame, Beef, Cookie, Droplet } from "lucide-react";

interface MealLog {
  id: string;
  meal_name: string;
  meal_type: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  logged_date: string;
  logged_time: string;
  notes: string | null;
}

interface MealHistoryProps {
  refresh?: number;
}

export function MealHistory({ refresh }: MealHistoryProps) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  });

  useEffect(() => {
    if (user) {
      fetchMeals();
    }
  }, [user, refresh]);

  const fetchMeals = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user?.id)
        .eq("logged_date", today)
        .order("logged_time", { ascending: false });

      if (error) throw error;

      setMeals(data || []);
      
      // Calculate stats
      const totals = (data || []).reduce((acc, meal) => ({
        totalCalories: acc.totalCalories + (meal.calories || 0),
        totalProtein: acc.totalProtein + (meal.protein_grams || 0),
        totalCarbs: acc.totalCarbs + (meal.carbs_grams || 0),
        totalFat: acc.totalFat + (meal.fat_grams || 0)
      }), {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0
      });
      
      setStats(totals);
    } catch (error: any) {
      console.error("Failed to load meals:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍪';
      default: return '🍽️';
    }
  };

  const getMealTypeColor = (type: string) => {
    switch (type) {
      case 'breakfast': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'lunch': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      case 'dinner': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'snack': return 'bg-green-500/10 text-green-700 border-green-500/20';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading meals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Daily Stats */}
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle>Today's Nutrition</CardTitle>
          <CardDescription>{format(new Date(), "EEEE, MMMM d, yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-primary/10 text-center">
              <Flame className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{stats.totalCalories}</p>
              <p className="text-xs text-muted-foreground">Calories</p>
            </div>
            <div className="p-4 rounded-lg bg-red-500/10 text-center">
              <Beef className="h-6 w-6 mx-auto mb-2 text-red-600" />
              <p className="text-2xl font-bold text-foreground">{stats.totalProtein.toFixed(1)}g</p>
              <p className="text-xs text-muted-foreground">Protein</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-500/10 text-center">
              <Cookie className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <p className="text-2xl font-bold text-foreground">{stats.totalCarbs.toFixed(1)}g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 text-center">
              <Droplet className="h-6 w-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-foreground">{stats.totalFat.toFixed(1)}g</p>
              <p className="text-xs text-muted-foreground">Fat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Logs */}
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Meal History
          </CardTitle>
          <CardDescription>Your meals logged today</CardDescription>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Utensils className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No meals logged yet today</p>
              <p className="text-sm mt-1">Start tracking your nutrition!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((meal) => (
                <div
                  key={meal.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getMealTypeEmoji(meal.meal_type)}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{meal.meal_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(`2000-01-01T${meal.logged_time}`), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <Badge className={getMealTypeColor(meal.meal_type)}>
                      {meal.meal_type}
                    </Badge>
                  </div>

                  {(meal.calories || meal.protein_grams || meal.carbs_grams || meal.fat_grams) && (
                    <div className="flex gap-4 text-sm mt-3">
                      {meal.calories && (
                        <div className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-primary" />
                          <span className="font-medium">{meal.calories}</span>
                          <span className="text-muted-foreground">cal</span>
                        </div>
                      )}
                      {meal.protein_grams && (
                        <div className="flex items-center gap-1">
                          <Beef className="h-3 w-3 text-red-600" />
                          <span className="font-medium">{meal.protein_grams.toFixed(1)}</span>
                          <span className="text-muted-foreground">P</span>
                        </div>
                      )}
                      {meal.carbs_grams && (
                        <div className="flex items-center gap-1">
                          <Cookie className="h-3 w-3 text-amber-600" />
                          <span className="font-medium">{meal.carbs_grams.toFixed(1)}</span>
                          <span className="text-muted-foreground">C</span>
                        </div>
                      )}
                      {meal.fat_grams && (
                        <div className="flex items-center gap-1">
                          <Droplet className="h-3 w-3 text-blue-600" />
                          <span className="font-medium">{meal.fat_grams.toFixed(1)}</span>
                          <span className="text-muted-foreground">F</span>
                        </div>
                      )}
                    </div>
                  )}

                  {meal.notes && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{meal.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
