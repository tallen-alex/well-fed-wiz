import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfDay, differenceInDays } from "date-fns";
import { ChefHat, CheckCircle2, Calendar } from "lucide-react";

interface MealPlanMeal {
  id: string;
  meal_type: string;
  meal_name: string;
  description: string | null;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  ingredients: string | null;
  instructions: string | null;
}

interface TodaysMealPlanProps {
  onMealCompleted: () => void;
}

export const TodaysMealPlan = ({ onMealCompleted }: TodaysMealPlanProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [todaysMeals, setTodaysMeals] = useState<MealPlanMeal[]>([]);
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set());
  const [planTitle, setPlanTitle] = useState("");

  useEffect(() => {
    if (user) {
      fetchTodaysMealPlan();
    }
  }, [user]);

  const fetchTodaysMealPlan = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get active assignment
      const { data: assignments, error: assignError } = await supabase
        .from("client_meal_plans")
        .select("*, meal_plans(id, title, duration_days)")
        .eq("client_id", currentUser.id)
        .eq("status", "active")
        .single();

      if (assignError || !assignments) {
        setLoading(false);
        return;
      }

      setPlanTitle((assignments.meal_plans as any).title);
      const startDate = new Date(assignments.start_date);
      const today = startOfDay(new Date());
      const daysSinceStart = differenceInDays(today, startOfDay(startDate));
      const currentDayNumber = daysSinceStart + 1;

      // Check if we're within the plan duration
      if (currentDayNumber < 1 || currentDayNumber > (assignments.meal_plans as any).duration_days) {
        setLoading(false);
        return;
      }

      // Fetch today's meals
      const { data: dayData, error: dayError } = await supabase
        .from("meal_plan_days")
        .select("id, meal_plan_meals(*)")
        .eq("meal_plan_id", assignments.meal_plan_id)
        .eq("day_number", currentDayNumber)
        .single();

      if (dayError || !dayData) {
        setLoading(false);
        return;
      }

      setTodaysMeals((dayData.meal_plan_meals as any) || []);

      // Fetch completed meals
      const todayStr = format(today, "yyyy-MM-dd");
      const { data: logs, error: logsError } = await supabase
        .from("meal_logs")
        .select("meal_name, meal_type")
        .eq("user_id", currentUser.id)
        .eq("logged_date", todayStr);

      if (!logsError && logs) {
        const completed = new Set(
          logs.map((log) => `${log.meal_type}_${log.meal_name}`)
        );
        setCompletedMeals(completed);
      }
    } catch (error) {
      console.error("Error fetching meal plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMealCompletion = async (meal: MealPlanMeal) => {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const key = `${meal.meal_type}_${meal.meal_name}`;

      if (completedMeals.has(key)) {
        // Remove completion
        const { error } = await supabase
          .from("meal_logs")
          .delete()
          .eq("user_id", user?.id)
          .eq("logged_date", todayStr)
          .eq("meal_type", meal.meal_type)
          .eq("meal_name", meal.meal_name);

        if (error) throw error;

        const newCompleted = new Set(completedMeals);
        newCompleted.delete(key);
        setCompletedMeals(newCompleted);

        toast({
          title: "Meal unmarked",
          description: "Removed from today's log",
        });
      } else {
        // Mark as completed
        const { error } = await supabase.from("meal_logs").insert({
          user_id: user?.id,
          meal_name: meal.meal_name,
          meal_type: meal.meal_type,
          calories: meal.calories,
          protein_grams: meal.protein_grams,
          carbs_grams: meal.carbs_grams,
          fat_grams: meal.fat_grams,
          logged_date: todayStr,
          logged_time: format(new Date(), "HH:mm:ss"),
          notes: "Completed from meal plan",
        });

        if (error) throw error;

        const newCompleted = new Set(completedMeals);
        newCompleted.add(key);
        setCompletedMeals(newCompleted);

        toast({
          title: "Great job! 🎉",
          description: `${meal.meal_name} marked as completed`,
        });
      }

      onMealCompleted();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal completion",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return null;
  }

  if (todaysMeals.length === 0) {
    return null;
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Meal Plan
            </CardTitle>
            <CardDescription>{planTitle}</CardDescription>
          </div>
          <Badge variant="default">
            {completedMeals.size} / {todaysMeals.length} completed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todaysMeals.map((meal) => {
          const isCompleted = completedMeals.has(`${meal.meal_type}_${meal.meal_name}`);
          
          return (
            <div
              key={meal.id}
              className={`p-4 rounded-lg border transition-all ${
                isCompleted ? "bg-primary/5 border-primary/30" : "bg-card"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <Checkbox
                    checked={isCompleted}
                    onCheckedChange={() => toggleMealCompletion(meal)}
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <ChefHat className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{meal.meal_name}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{meal.meal_type}</p>
                    </div>
                  </div>
                </div>
                {isCompleted && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
              </div>

              {meal.description && (
                <p className="text-sm text-muted-foreground ml-9 mb-2">{meal.description}</p>
              )}

              {(meal.calories || meal.protein_grams || meal.carbs_grams || meal.fat_grams) && (
                <div className="flex gap-3 text-sm ml-9">
                  {meal.calories && (
                    <span className="bg-muted px-2 py-1 rounded">
                      <span className="font-medium">{meal.calories}</span> cal
                    </span>
                  )}
                  {meal.protein_grams && (
                    <span className="bg-muted px-2 py-1 rounded">
                      <span className="font-medium">{meal.protein_grams}g</span> P
                    </span>
                  )}
                  {meal.carbs_grams && (
                    <span className="bg-muted px-2 py-1 rounded">
                      <span className="font-medium">{meal.carbs_grams}g</span> C
                    </span>
                  )}
                  {meal.fat_grams && (
                    <span className="bg-muted px-2 py-1 rounded">
                      <span className="font-medium">{meal.fat_grams}g</span> F
                    </span>
                  )}
                </div>
              )}

              {meal.ingredients && !isCompleted && (
                <details className="text-sm mt-2 ml-9">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    View details
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <p className="font-medium mb-1">Ingredients:</p>
                      <p className="text-muted-foreground whitespace-pre-line">{meal.ingredients}</p>
                    </div>
                    {meal.instructions && (
                      <div>
                        <p className="font-medium mb-1">Instructions:</p>
                        <p className="text-muted-foreground whitespace-pre-line">{meal.instructions}</p>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};