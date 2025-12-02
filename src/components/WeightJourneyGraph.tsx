import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { TrendingDown, TrendingUp, Plus, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeightRecord {
  recorded_date: string;
  weight_kg: number;
}

interface WeightJourneyGraphProps {
  targetWeight?: number;
  onWeightAdded?: () => void;
}

export function WeightJourneyGraph({ targetWeight, onWeightAdded }: WeightJourneyGraphProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weightHistory, setWeightHistory] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [recordDate, setRecordDate] = useState<Date>(new Date());

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
          recorded_date: format(recordDate, "yyyy-MM-dd"),
        });

      if (error) throw error;

      toast({
        title: "Weight Recorded! 📊",
        description: "Keep up the great work!",
      });

      setAddDialogOpen(false);
      setNewWeight("");
      setRecordDate(new Date());
      fetchWeightHistory();
      onWeightAdded?.();
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
                <Label htmlFor="weight-empty">Weight (kg)</Label>
                <Input
                  id="weight-empty"
                  type="number"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  placeholder="70.5"
                  step="0.1"
                  min="20"
                  max="500"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !recordDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recordDate ? format(recordDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recordDate}
                      onSelect={(date) => date && setRecordDate(date)}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
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

  // Calculate trend analysis
  const calculateTrendAnalysis = () => {
    if (weightHistory.length < 2) return null;

    const firstDate = new Date(weightHistory[0].recorded_date);
    const lastDate = new Date(weightHistory[weightHistory.length - 1].recorded_date);
    const daysDiff = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeksDiff = daysDiff / 7;
    
    const avgWeeklyChange = weeksDiff > 0 ? weightChange / weeksDiff : 0;
    
    // Calculate projected weeks to target
    let weeksToTarget = null;
    let projectedDate = null;
    
    if (targetWeight && avgWeeklyChange !== 0) {
      const remainingWeight = currentWeight - targetWeight;
      weeksToTarget = Math.abs(remainingWeight / avgWeeklyChange);
      
      const projectionDate = new Date();
      projectionDate.setDate(projectionDate.getDate() + (weeksToTarget * 7));
      projectedDate = projectionDate;
    }
    
    return {
      avgWeeklyChange,
      weeksToTarget,
      projectedDate,
      isOnTrack: targetWeight ? 
        (isLosing && currentWeight > targetWeight) || (!isLosing && currentWeight < targetWeight) :
        null
    };
  };

  const trendAnalysis = calculateTrendAnalysis();

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

          {trendAnalysis && (
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                Trend Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Average Weekly Change</p>
                  <p className={`text-xl font-bold ${
                    trendAnalysis.avgWeeklyChange < 0 ? 'text-green-600' : 
                    trendAnalysis.avgWeeklyChange > 0 ? 'text-orange-600' : 
                    'text-muted-foreground'
                  }`}>
                    {trendAnalysis.avgWeeklyChange > 0 ? '+' : ''}
                    {trendAnalysis.avgWeeklyChange.toFixed(2)} kg/week
                  </p>
                  {Math.abs(trendAnalysis.avgWeeklyChange) < 0.5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Healthy, sustainable pace 👍
                    </p>
                  )}
                  {Math.abs(trendAnalysis.avgWeeklyChange) >= 1 && (
                    <p className="text-xs text-orange-600 mt-1">
                      Consider a more gradual approach
                    </p>
                  )}
                </div>
                
                {targetWeight && trendAnalysis.weeksToTarget && trendAnalysis.projectedDate && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Projected Target Date</p>
                    <p className="text-xl font-bold text-primary">
                      {trendAnalysis.weeksToTarget < 1 ? (
                        "Less than a week! 🎉"
                      ) : trendAnalysis.weeksToTarget > 100 ? (
                        "Adjust your plan"
                      ) : (
                        format(trendAnalysis.projectedDate, "MMM dd, yyyy")
                      )}
                    </p>
                    {trendAnalysis.weeksToTarget > 0 && trendAnalysis.weeksToTarget <= 100 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ~{Math.round(trendAnalysis.weeksToTarget)} weeks at current pace
                      </p>
                    )}
                    {trendAnalysis.isOnTrack === false && (
                      <p className="text-xs text-orange-600 mt-1">
                        Current trend is moving away from target
                      </p>
                    )}
                  </div>
                )}

                {!targetWeight && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Set a Target</p>
                    <p className="text-sm text-muted-foreground">
                      Set your target weight in your profile to see projections
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
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
            
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !recordDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {recordDate ? format(recordDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={recordDate}
                    onSelect={(date) => date && setRecordDate(date)}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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
