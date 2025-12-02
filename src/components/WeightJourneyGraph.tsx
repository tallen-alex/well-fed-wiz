import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { TrendingDown, TrendingUp, Plus } from "lucide-react";

interface WeightRecord {
  recorded_date: string;
  weight_kg: number;
}

interface WeightJourneyGraphProps {
  targetWeight?: number;
}

export function WeightJourneyGraph({ targetWeight }: WeightJourneyGraphProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");

  useEffect(() => {
    if (user) {
      fetchWeightHistory();
    }
  }, [user]);

  const fetchWeightHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("weight_history")
        .select("recorded_date, weight_kg")
        .eq("user_id", user?.id)
        .order("recorded_date", { ascending: true });

      if (error) throw error;
      setWeightHistory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load weight history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeight = async () => {
    const weight = parseFloat(newWeight);
    if (!weight || weight <= 0) {
      toast({
        title: "Invalid Weight",
        description: "Please enter a valid weight",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("weight_history")
        .insert({
          user_id: user?.id,
          weight_kg: weight,
        });

      if (error) throw error;

      toast({
        title: "Weight Recorded! 📊",
        description: "Keep up the great work!",
      });

      setAddDialogOpen(false);
      setNewWeight("");
      fetchWeightHistory();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to record weight",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your journey...</div>;
  }

  if (weightHistory.length === 0) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle>Your Weight Journey 📈</CardTitle>
            <CardDescription>Start tracking your progress!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No weight records yet</p>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Record
              </Button>
            </div>
          </CardContent>
        </Card>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log Your Weight</DialogTitle>
              <DialogDescription>
                Record your current weight to track your progress
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="70.5"
                  step="0.1"
                  min="20"
                  max="500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddWeight}>
                  Save Weight
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  const chartData = weightHistory.map((record) => ({
    date: format(new Date(record.recorded_date), "MMM dd"),
    weight: record.weight_kg,
  }));

  const currentWeight = weightHistory[weightHistory.length - 1].weight_kg;
  const startWeight = weightHistory[0].weight_kg;
  const weightChange = currentWeight - startWeight;
  const isLosing = weightChange < 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Your Weight Journey 📈
                {isLosing ? (
                  <TrendingDown className="h-5 w-5 text-green-500" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                )}
              </CardTitle>
              <CardDescription>
                {Math.abs(weightChange).toFixed(1)} kg {isLosing ? "lost" : "gained"} since you started! 
                {targetWeight && ` • Goal: ${targetWeight} kg`}
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Log Weight
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px"
                  }}
                  formatter={(value: number) => [`${value} kg`, "Weight"]}
                />
                {targetWeight && (
                  <ReferenceLine 
                    y={targetWeight} 
                    stroke="hsl(var(--primary))" 
                    strokeDasharray="5 5"
                    label={{ value: "Target", position: "right", fill: "hsl(var(--primary))" }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--primary))", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <p className="text-lg font-bold">{startWeight} kg</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-xs text-muted-foreground mb-1">Current</p>
              <p className="text-lg font-bold text-primary">{currentWeight} kg</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Change</p>
              <p className={`text-lg font-bold ${isLosing ? 'text-green-500' : 'text-blue-500'}`}>
                {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Your Weight</DialogTitle>
            <DialogDescription>
              Record your current weight to track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="70.5"
                step="0.1"
                min="20"
                max="500"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddWeight}>
                Save Weight
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
