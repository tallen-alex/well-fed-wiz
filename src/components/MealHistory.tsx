import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Flame, Beef, Cookie, Droplet, Coffee, Sun, Moon, Apple, Edit, Trash2, UtensilsCrossed } from "lucide-react";

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
  const { toast } = useToast();
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMeal, setEditingMeal] = useState<MealLog | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    meal_name: "",
    calories: 0,
    protein_grams: 0,
    carbs_grams: 0,
    fat_grams: 0,
  });
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

  useEffect(() => {
    if (editingMeal) {
      setEditForm({
        meal_name: editingMeal.meal_name,
        calories: editingMeal.calories || 0,
        protein_grams: editingMeal.protein_grams || 0,
        carbs_grams: editingMeal.carbs_grams || 0,
        fat_grams: editingMeal.fat_grams || 0,
      });
    }
  }, [editingMeal]);

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

  const handleEditMeal = async () => {
    if (!editingMeal) return;

    try {
      const { error } = await supabase
        .from("meal_logs")
        .update({
          meal_name: editForm.meal_name,
          calories: editForm.calories,
          protein_grams: editForm.protein_grams,
          carbs_grams: editForm.carbs_grams,
          fat_grams: editForm.fat_grams,
        })
        .eq("id", editingMeal.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meal updated successfully",
      });

      setEditingMeal(null);
      fetchMeals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update meal",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeal = async () => {
    if (!deletingMealId) return;

    try {
      const { error } = await supabase
        .from("meal_logs")
        .delete()
        .eq("id", deletingMealId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meal deleted successfully",
      });

      setDeletingMealId(null);
      fetchMeals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete meal",
        variant: "destructive",
      });
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case "breakfast":
        return <Coffee className="h-5 w-5 text-amber-500" />;
      case "lunch":
        return <Sun className="h-5 w-5 text-orange-500" />;
      case "dinner":
        return <Moon className="h-5 w-5 text-indigo-500" />;
      case "snack":
        return <Apple className="h-5 w-5 text-green-500" />;
      default:
        return <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getMealTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'breakfast': return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
      case 'lunch': return 'bg-orange-500/10 text-orange-700 border-orange-500/20';
      case 'dinner': return 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20';
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
          <CardTitle>Today's Nutrition Summary</CardTitle>
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
            <UtensilsCrossed className="h-5 w-5" />
            Meal History
          </CardTitle>
          <CardDescription>Your meals logged today (including meal plan completions)</CardDescription>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
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
                    <div className="flex items-center gap-3">
                      {getMealIcon(meal.meal_type)}
                      <div>
                        <h3 className="font-semibold text-foreground">{meal.meal_name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(`2000-01-01T${meal.logged_time}`), "h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getMealTypeColor(meal.meal_type)}>
                        {meal.meal_type}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMeal(meal)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingMealId(meal.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingMeal} onOpenChange={() => setEditingMeal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
            <DialogDescription>Update the meal details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Meal Name</Label>
              <Input
                value={editForm.meal_name}
                onChange={(e) => setEditForm({ ...editForm, meal_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Calories</Label>
                <Input
                  type="number"
                  value={editForm.calories}
                  onChange={(e) => setEditForm({ ...editForm, calories: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Protein (g)</Label>
                <Input
                  type="number"
                  value={editForm.protein_grams}
                  onChange={(e) => setEditForm({ ...editForm, protein_grams: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Carbs (g)</Label>
                <Input
                  type="number"
                  value={editForm.carbs_grams}
                  onChange={(e) => setEditForm({ ...editForm, carbs_grams: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Fat (g)</Label>
                <Input
                  type="number"
                  value={editForm.fat_grams}
                  onChange={(e) => setEditForm({ ...editForm, fat_grams: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditMeal}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingMeal(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingMealId} onOpenChange={() => setDeletingMealId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this meal log. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}