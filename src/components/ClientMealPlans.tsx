import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { Calendar, ChefHat, Clock, UtensilsCrossed, CheckCircle2 } from "lucide-react";

interface MealPlanAssignment {
  id: string;
  start_date: string;
  status: string;
  notes: string | null;
  meal_plans: {
    id: string;
    title: string;
    description: string | null;
    duration_days: number;
  };
}

interface MealPlanDay {
  id: string;
  day_number: number;
  notes: string | null;
  meal_plan_meals: Array<{
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
  }>;
}

export const ClientMealPlans = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<MealPlanAssignment[]>([]);
  const [selectedPlanDays, setSelectedPlanDays] = useState<MealPlanDay[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [completedMeals, setCompletedMeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("client_meal_plans")
        .select(`
          id,
          start_date,
          status,
          notes,
          meal_plans (
            id,
            title,
            description,
            duration_days
          )
        `)
        .eq("client_id", user?.id)
        .eq("status", "active")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setAssignments(data as any || []);

      if (data && data.length > 0) {
        loadMealPlanDays(data[0].meal_plans.id);
        fetchCompletedMeals(data[0].start_date, data[0].meal_plans.duration_days);
      }
    } catch (error: any) {
      console.error("Error fetching meal plans:", error);
      toast({
        title: "Error",
        description: "Failed to load meal plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMealPlanDays = async (planId: string) => {
    try {
      setSelectedPlanId(planId);
      
      const { data, error } = await supabase
        .from("meal_plan_days")
        .select(`
          id,
          day_number,
          notes,
          meal_plan_meals (
            id,
            meal_type,
            meal_name,
            description,
            calories,
            protein_grams,
            carbs_grams,
            fat_grams,
            ingredients,
            instructions
          )
        `)
        .eq("meal_plan_id", planId)
        .order("day_number");

      if (error) throw error;
      setSelectedPlanDays(data as any || []);
      setCurrentDay(1);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load meal plan details",
        variant: "destructive",
      });
    }
  };

  const fetchCompletedMeals = async (startDate: string, durationDays: number) => {
    try {
      const endDate = format(addDays(new Date(startDate), durationDays - 1), "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from("meal_logs")
        .select("meal_name, logged_date, meal_type")
        .eq("user_id", user?.id)
        .gte("logged_date", startDate)
        .lte("logged_date", endDate);

      if (error) throw error;

      const completed = new Set(
        (data || []).map((log) => `${log.logged_date}_${log.meal_type}_${log.meal_name}`)
      );
      setCompletedMeals(completed);
    } catch (error: any) {
      console.error("Error fetching completed meals:", error);
    }
  };

  const toggleMealCompletion = async (
    meal: MealPlanDay["meal_plan_meals"][0],
    dayNumber: number,
    startDate: string
  ) => {
    try {
      const mealDate = format(addDays(new Date(startDate), dayNumber - 1), "yyyy-MM-dd");
      const key = `${mealDate}_${meal.meal_type}_${meal.meal_name}`;

      if (completedMeals.has(key)) {
        // Remove completion
        const { error } = await supabase
          .from("meal_logs")
          .delete()
          .eq("user_id", user?.id)
          .eq("logged_date", mealDate)
          .eq("meal_type", meal.meal_type)
          .eq("meal_name", meal.meal_name);

        if (error) throw error;

        const newCompleted = new Set(completedMeals);
        newCompleted.delete(key);
        setCompletedMeals(newCompleted);

        toast({
          title: "Meal unmarked",
          description: "Meal removed from completed list",
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
          logged_date: mealDate,
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal completion",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading meal plans...</div>;
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No meal plans assigned yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Sam will assign a personalized nutrition plan for you
          </p>
        </CardContent>
      </Card>
    );
  }

  const activePlan = assignments[0];
  const currentDayData = selectedPlanDays.find(d => d.day_number === currentDay);

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{activePlan.meal_plans.title}</CardTitle>
              {activePlan.meal_plans.description && (
                <CardDescription className="mt-2 text-base">
                  {activePlan.meal_plans.description}
                </CardDescription>
              )}
            </div>
            <Badge className="bg-primary">Active</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Started: {format(new Date(activePlan.start_date), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {activePlan.meal_plans.duration_days} days
            </span>
          </div>
          {activePlan.notes && (
            <div className="mt-4 p-3 bg-background rounded-lg">
              <p className="text-sm text-foreground">{activePlan.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h3 className="font-outfit text-xl font-bold text-foreground mb-4">Daily Meal Plan</h3>
        <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))}>
          <TabsList className="flex-wrap h-auto">
            {selectedPlanDays.map((day) => (
              <TabsTrigger key={day.day_number} value={day.day_number.toString()}>
                Day {day.day_number}
              </TabsTrigger>
            ))}
          </TabsList>

          {selectedPlanDays.map((day) => (
            <TabsContent key={day.day_number} value={day.day_number.toString()} className="space-y-4 mt-4">
              {day.notes && (
                <Card className="bg-accent">
                  <CardContent className="pt-6">
                    <p className="text-sm">{day.notes}</p>
                  </CardContent>
                </Card>
              )}

              {day.meal_plan_meals.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No meals planned for this day
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {day.meal_plan_meals.map((meal, index) => {
                    const mealDate = format(addDays(new Date(activePlan.start_date), day.day_number - 1), "yyyy-MM-dd");
                    const isCompleted = completedMeals.has(`${mealDate}_${meal.meal_type}_${meal.meal_name}`);
                    
                    return (
                      <Card key={index} className={isCompleted ? "bg-primary/5 border-primary/30" : ""}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={() => toggleMealCompletion(meal, day.day_number, activePlan.start_date)}
                              />
                              <div className="flex items-center gap-2">
                                <ChefHat className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg capitalize">{meal.meal_type}</CardTitle>
                              </div>
                            </div>
                            {isCompleted && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <CardDescription className="text-base font-medium ml-9">
                            {meal.meal_name}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 ml-9">
                        {meal.description && (
                          <p className="text-sm text-muted-foreground">{meal.description}</p>
                        )}

                        {(meal.calories || meal.protein_grams || meal.carbs_grams || meal.fat_grams) && (
                          <div className="flex gap-4 text-sm">
                            {meal.calories && (
                              <div className="bg-accent px-3 py-1 rounded">
                                <span className="font-medium">{meal.calories}</span> cal
                              </div>
                            )}
                            {meal.protein_grams && (
                              <div className="bg-accent px-3 py-1 rounded">
                                <span className="font-medium">{meal.protein_grams}g</span> protein
                              </div>
                            )}
                            {meal.carbs_grams && (
                              <div className="bg-accent px-3 py-1 rounded">
                                <span className="font-medium">{meal.carbs_grams}g</span> carbs
                              </div>
                            )}
                            {meal.fat_grams && (
                              <div className="bg-accent px-3 py-1 rounded">
                                <span className="font-medium">{meal.fat_grams}g</span> fat
                              </div>
                            )}
                          </div>
                        )}

                        {meal.ingredients && (
                          <div>
                            <p className="font-medium text-sm mb-2">Ingredients:</p>
                            <div className="text-sm text-muted-foreground whitespace-pre-line bg-accent p-3 rounded">
                              {meal.ingredients}
                            </div>
                          </div>
                        )}

                        {meal.instructions && (
                          <div>
                            <p className="font-medium text-sm mb-2">Instructions:</p>
                            <div className="text-sm text-muted-foreground whitespace-pre-line">
                              {meal.instructions}
                            </div>
                          </div>
                        )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
