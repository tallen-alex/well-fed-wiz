import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, ChefHat, Clock, UtensilsCrossed } from "lucide-react";

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
                  {day.meal_plan_meals.map((meal, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <ChefHat className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg capitalize">{meal.meal_type}</CardTitle>
                        </div>
                        <CardDescription className="text-base font-medium">
                          {meal.meal_name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
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
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};
