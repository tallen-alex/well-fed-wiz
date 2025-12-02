import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowLeft } from "lucide-react";

interface Meal {
  meal_type: string;
  meal_name: string;
  description: string;
  calories: number | null;
  protein_grams: number | null;
  carbs_grams: number | null;
  fat_grams: number | null;
  ingredients: string;
  instructions: string;
}

interface Day {
  day_number: number;
  notes: string;
  meals: Meal[];
}

interface MealPlanEditorProps {
  planId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const MealPlanEditor = ({ planId, open, onOpenChange, onSuccess }: MealPlanEditorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState(7);
  const [currentDay, setCurrentDay] = useState(1);
  const [days, setDays] = useState<Day[]>([]);

  useEffect(() => {
    if (open && !planId) {
      // Initialize new plan with 7 empty days
      const initialDays: Day[] = Array.from({ length: 7 }, (_, i) => ({
        day_number: i + 1,
        notes: "",
        meals: [],
      }));
      setDays(initialDays);
    } else if (open && planId) {
      loadMealPlan();
    }
  }, [open, planId]);

  const loadMealPlan = async () => {
    if (!planId) return;
    
    try {
      setLoading(true);
      
      // Load meal plan
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", planId)
        .single();

      if (planError) throw planError;

      setTitle(plan.title);
      setDescription(plan.description || "");
      setDurationDays(plan.duration_days);

      // Load days and meals
      const { data: daysData, error: daysError } = await supabase
        .from("meal_plan_days")
        .select("*, meal_plan_meals(*)")
        .eq("meal_plan_id", planId)
        .order("day_number");

      if (daysError) throw daysError;

      const loadedDays: Day[] = daysData.map(day => ({
        day_number: day.day_number,
        notes: day.notes || "",
        meals: (day.meal_plan_meals as any[]).map(meal => ({
          meal_type: meal.meal_type,
          meal_name: meal.meal_name,
          description: meal.description || "",
          calories: meal.calories,
          protein_grams: meal.protein_grams,
          carbs_grams: meal.carbs_grams,
          fat_grams: meal.fat_grams,
          ingredients: meal.ingredients || "",
          instructions: meal.instructions || "",
        })),
      }));

      setDays(loadedDays);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load meal plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a title for the meal plan",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let mealPlanId = planId;

      if (planId) {
        // Update existing plan
        const { error: updateError } = await supabase
          .from("meal_plans")
          .update({
            title,
            description,
            duration_days: durationDays,
          })
          .eq("id", planId);

        if (updateError) throw updateError;

        // Delete existing days and meals
        const { error: deleteDaysError } = await supabase
          .from("meal_plan_days")
          .delete()
          .eq("meal_plan_id", planId);

        if (deleteDaysError) throw deleteDaysError;
      } else {
        // Create new plan
        const { data: newPlan, error: createError } = await supabase
          .from("meal_plans")
          .insert({
            title,
            description,
            duration_days: durationDays,
            created_by: user?.id,
          })
          .select()
          .single();

        if (createError) throw createError;
        mealPlanId = newPlan.id;
      }

      // Insert days and meals
      for (const day of days) {
        const { data: dayData, error: dayError } = await supabase
          .from("meal_plan_days")
          .insert({
            meal_plan_id: mealPlanId,
            day_number: day.day_number,
            notes: day.notes,
          })
          .select()
          .single();

        if (dayError) throw dayError;

        if (day.meals.length > 0) {
          const mealsToInsert = day.meals.map(meal => ({
            meal_plan_day_id: dayData.id,
            ...meal,
          }));

          const { error: mealsError } = await supabase
            .from("meal_plan_meals")
            .insert(mealsToInsert);

          if (mealsError) throw mealsError;
        }
      }

      toast({
        title: "Success",
        description: planId ? "Meal plan updated successfully" : "Meal plan created successfully",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save meal plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMeal = (mealType: string) => {
    const updatedDays = [...days];
    const dayIndex = days.findIndex(d => d.day_number === currentDay);
    
    if (dayIndex !== -1) {
      updatedDays[dayIndex].meals.push({
        meal_type: mealType,
        meal_name: "",
        description: "",
        calories: null,
        protein_grams: null,
        carbs_grams: null,
        fat_grams: null,
        ingredients: "",
        instructions: "",
      });
      setDays(updatedDays);
    }
  };

  const updateMeal = (dayNumber: number, mealIndex: number, field: string, value: any) => {
    const updatedDays = [...days];
    const dayIndex = days.findIndex(d => d.day_number === dayNumber);
    
    if (dayIndex !== -1) {
      updatedDays[dayIndex].meals[mealIndex] = {
        ...updatedDays[dayIndex].meals[mealIndex],
        [field]: value,
      };
      setDays(updatedDays);
    }
  };

  const removeMeal = (dayNumber: number, mealIndex: number) => {
    const updatedDays = [...days];
    const dayIndex = days.findIndex(d => d.day_number === dayNumber);
    
    if (dayIndex !== -1) {
      updatedDays[dayIndex].meals.splice(mealIndex, 1);
      setDays(updatedDays);
    }
  };

  const currentDayData = days.find(d => d.day_number === currentDay) || { day_number: currentDay, notes: "", meals: [] };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{planId ? "Edit Meal Plan" : "Create New Meal Plan"}</DialogTitle>
          <DialogDescription>
            Design a personalized nutrition plan for your clients
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Plan Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 7-Day Weight Loss Plan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the goals and approach of this meal plan..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Days)</Label>
              <Select
                value={durationDays.toString()}
                onValueChange={(value) => {
                  const newDuration = parseInt(value);
                  setDurationDays(newDuration);
                  
                  // Adjust days array
                  if (newDuration > days.length) {
                    const newDays = Array.from({ length: newDuration - days.length }, (_, i) => ({
                      day_number: days.length + i + 1,
                      notes: "",
                      meals: [],
                    }));
                    setDays([...days, ...newDays]);
                  } else if (newDuration < days.length) {
                    setDays(days.slice(0, newDuration));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 14, 21, 30].map((days) => (
                    <SelectItem key={days} value={days.toString()}>
                      {days} days
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Days</Label>
            <Tabs value={currentDay.toString()} onValueChange={(v) => setCurrentDay(parseInt(v))}>
              <TabsList className="flex-wrap h-auto">
                {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => (
                  <TabsTrigger key={day} value={day.toString()}>
                    Day {day}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Array.from({ length: durationDays }, (_, i) => i + 1).map((day) => (
                <TabsContent key={day} value={day.toString()} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Day Notes</Label>
                    <Textarea
                      value={currentDayData.notes}
                      onChange={(e) => {
                        const updatedDays = [...days];
                        const dayIndex = days.findIndex(d => d.day_number === day);
                        if (dayIndex !== -1) {
                          updatedDays[dayIndex].notes = e.target.value;
                          setDays(updatedDays);
                        }
                      }}
                      placeholder="Add any notes or guidelines for this day..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Meals</Label>
                      <Select onValueChange={addMeal}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Add meal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {currentDayData.meals.map((meal, mealIndex) => (
                      <Card key={mealIndex}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base capitalize">{meal.meal_type}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMeal(day, mealIndex)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Input
                            placeholder="Meal name"
                            value={meal.meal_name}
                            onChange={(e) => updateMeal(day, mealIndex, "meal_name", e.target.value)}
                          />
                          <Textarea
                            placeholder="Description"
                            value={meal.description}
                            onChange={(e) => updateMeal(day, mealIndex, "description", e.target.value)}
                            rows={2}
                          />
                          <div className="grid grid-cols-4 gap-2">
                            <Input
                              type="number"
                              placeholder="Calories"
                              value={meal.calories || ""}
                              onChange={(e) => updateMeal(day, mealIndex, "calories", parseInt(e.target.value) || null)}
                            />
                            <Input
                              type="number"
                              placeholder="Protein (g)"
                              value={meal.protein_grams || ""}
                              onChange={(e) => updateMeal(day, mealIndex, "protein_grams", parseInt(e.target.value) || null)}
                            />
                            <Input
                              type="number"
                              placeholder="Carbs (g)"
                              value={meal.carbs_grams || ""}
                              onChange={(e) => updateMeal(day, mealIndex, "carbs_grams", parseInt(e.target.value) || null)}
                            />
                            <Input
                              type="number"
                              placeholder="Fat (g)"
                              value={meal.fat_grams || ""}
                              onChange={(e) => updateMeal(day, mealIndex, "fat_grams", parseInt(e.target.value) || null)}
                            />
                          </div>
                          <Textarea
                            placeholder="Ingredients (one per line)"
                            value={meal.ingredients}
                            onChange={(e) => updateMeal(day, mealIndex, "ingredients", e.target.value)}
                            rows={3}
                          />
                          <Textarea
                            placeholder="Preparation instructions"
                            value={meal.instructions}
                            onChange={(e) => updateMeal(day, mealIndex, "instructions", e.target.value)}
                            rows={3}
                          />
                        </CardContent>
                      </Card>
                    ))}

                    {currentDayData.meals.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No meals added for this day yet</p>
                        <p className="text-sm mt-1">Use the dropdown above to add meals</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          <div className="flex gap-4 pt-4 border-t">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : planId ? "Update Plan" : "Create Plan"}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
