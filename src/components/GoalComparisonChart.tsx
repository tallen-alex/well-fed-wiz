import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Area, ComposedChart } from "recharts";
import { format, addDays, differenceInDays } from "date-fns";
import { Target, TrendingDown, TrendingUp, AlertCircle, CalendarIcon, Edit2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface WeightRecord {
  recorded_date: string;
  weight_kg: number;
}

interface GoalComparisonChartProps {
  weightHistory: WeightRecord[];
  startWeight?: number;
  targetWeight?: number;
  targetDate?: Date;
  userId?: string;
  onTargetDateUpdate?: () => void;
}

export function GoalComparisonChart({ weightHistory, startWeight, targetWeight, targetDate, userId, onTargetDateUpdate }: GoalComparisonChartProps) {
  const { toast } = useToast();
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [tempTargetDate, setTempTargetDate] = useState<Date | undefined>(targetDate);
  const [saving, setSaving] = useState(false);
  const handleSaveTargetDate = async () => {
    if (!userId || !tempTargetDate) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ target_date: format(tempTargetDate, "yyyy-MM-dd") })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Target Date Updated",
        description: "Your goal timeline has been updated successfully!",
      });
      
      setIsEditingDate(false);
      onTargetDateUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update target date",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!targetWeight || !startWeight || weightHistory.length === 0) {
    return (
      <Card className="backdrop-blur-sm bg-card/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Goal Timeline Comparison
          </CardTitle>
          <CardDescription>
            Set your target weight to see your progress timeline
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Add your target weight in your profile to unlock timeline predictions</p>
        </CardContent>
      </Card>
    );
  }

  const firstDate = new Date(weightHistory[0].recorded_date);
  const currentDate = new Date();
  const currentWeight = weightHistory[weightHistory.length - 1].weight_kg;
  
  // Calculate predicted timeline (assume healthy rate: 0.5-1kg per week)
  const totalWeightChange = Math.abs(targetWeight - startWeight);
  const healthyWeeksToGoal = totalWeightChange / 0.75; // 0.75kg per week is a healthy sustainable rate
  const effectiveTargetDate = tempTargetDate || targetDate || addDays(firstDate, healthyWeeksToGoal * 7);
  
  // Calculate required weekly rate to meet target date
  const daysToTarget = differenceInDays(effectiveTargetDate, currentDate);
  const weeksToTarget = Math.max(1, daysToTarget / 7);
  const requiredWeeklyRate = totalWeightChange > Math.abs(currentWeight - startWeight) 
    ? Math.abs(targetWeight - currentWeight) / weeksToTarget 
    : 0;
  
  // Calculate actual progress
  const actualWeightChange = Math.abs(currentWeight - startWeight);
  const daysElapsed = differenceInDays(currentDate, firstDate);
  const weeksElapsed = daysElapsed / 7;
  const actualRate = weeksElapsed > 0 ? actualWeightChange / weeksElapsed : 0;
  
  // Generate predicted ideal curve
  const totalDays = Math.max(differenceInDays(effectiveTargetDate, firstDate), daysElapsed + 30);
  const predictedData: any[] = [];
  
  for (let day = 0; day <= totalDays; day++) {
    const date = addDays(firstDate, day);
    const progress = day / totalDays;
    const predictedWeight = startWeight + (targetWeight - startWeight) * progress;
    
    predictedData.push({
      date: format(date, "MMM dd"),
      fullDate: date,
      predicted: predictedWeight,
    });
  }
  
  // Merge actual data with predicted
  const chartData = predictedData.map(point => {
    const actualRecord = weightHistory.find(record => {
      const recordDate = new Date(record.recorded_date);
      return format(recordDate, "MMM dd") === point.date;
    });
    
    return {
      ...point,
      actual: actualRecord?.weight_kg,
    };
  });
  
  // Calculate status
  const isOnTrack = Math.abs(currentWeight - startWeight) >= Math.abs(targetWeight - startWeight) * (daysElapsed / totalDays) * 0.8;
  const isAhead = currentWeight < targetWeight ? currentWeight < predictedData[daysElapsed]?.predicted : currentWeight > predictedData[daysElapsed]?.predicted;
  
  // Project completion date based on current rate
  let projectedCompletionDate = null;
  if (actualRate > 0) {
    const remainingWeight = Math.abs(targetWeight - currentWeight);
    const remainingWeeks = remainingWeight / actualRate;
    projectedCompletionDate = addDays(currentDate, remainingWeeks * 7);
  }

  return (
    <Card className="backdrop-blur-sm bg-card/95">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Goal Timeline Comparison
            </CardTitle>
            <CardDescription>
              Predicted ideal path vs your actual progress
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={isAhead ? "default" : "secondary"}
              className={isAhead ? "bg-green-500" : ""}
            >
              {isAhead ? (
                <><TrendingDown className="h-3 w-3 mr-1" /> Ahead of Target</>
              ) : (
                <><AlertCircle className="h-3 w-3 mr-1" /> Behind Target</>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Target Date Adjustment Section */}
        <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Target Date</h3>
              <p className="text-sm text-muted-foreground">Adjust your goal timeline</p>
            </div>
            {!isEditingDate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTempTargetDate(effectiveTargetDate);
                  setIsEditingDate(true);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Adjust Date
              </Button>
            )}
          </div>

          {isEditingDate ? (
            <div className="space-y-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !tempTargetDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {tempTargetDate ? format(tempTargetDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={tempTargetDate}
                    onSelect={(date) => date && setTempTargetDate(date)}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {tempTargetDate && (
                <div className="p-3 rounded-lg bg-card border">
                  <p className="text-sm font-medium text-foreground mb-2">Impact Analysis</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Required Weekly Rate:</span>
                      <span className={cn(
                        "font-semibold",
                        requiredWeeklyRate > 1 ? "text-orange-600" : 
                        requiredWeeklyRate < 0.5 ? "text-blue-600" : 
                        "text-green-600"
                      )}>
                        {requiredWeeklyRate.toFixed(2)} kg/week
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Health Assessment:</span>
                      <span className={cn(
                        "font-semibold",
                        requiredWeeklyRate > 1 ? "text-orange-600" : 
                        requiredWeeklyRate < 0.3 ? "text-blue-600" : 
                        "text-green-600"
                      )}>
                        {requiredWeeklyRate > 1 ? "Too Fast ⚠️" : 
                         requiredWeeklyRate < 0.3 ? "Very Gradual" : 
                         "Healthy Pace ✓"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weeks to Goal:</span>
                      <span className="font-semibold text-foreground">{Math.ceil(weeksToTarget)} weeks</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveTargetDate}
                  disabled={!tempTargetDate || saving}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingDate(false);
                    setTempTargetDate(effectiveTargetDate);
                  }}
                  disabled={saving}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Target Date</p>
                <p className="text-lg font-bold text-primary">
                  {format(effectiveTargetDate, "MMM dd, yyyy")}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Required Rate</p>
                <p className={cn(
                  "text-lg font-bold",
                  requiredWeeklyRate > 1 ? "text-orange-600" : 
                  requiredWeeklyRate < 0.5 ? "text-blue-600" : 
                  "text-green-600"
                )}>
                  {requiredWeeklyRate.toFixed(2)} kg/week
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="h-[350px] w-full mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="predictedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                interval="preserveStartEnd"
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
                formatter={(value: number, name: string) => {
                  const label = name === "predicted" ? "Ideal Path" : "Your Weight";
                  return [`${value.toFixed(1)} kg`, label];
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value: string) => {
                  if (value === "predicted") return "Ideal Path";
                  if (value === "actual") return "Your Progress";
                  return value;
                }}
              />
              
              {/* Target weight line */}
              <ReferenceLine 
                y={targetWeight} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Target: ${targetWeight} kg`, 
                  position: "right", 
                  fill: "hsl(var(--primary))",
                  fontSize: 12
                }}
              />
              
              {/* Predicted curve area */}
              <Area
                type="monotone"
                dataKey="predicted"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="8 4"
                fill="url(#predictedGradient)"
                dot={false}
              />
              
              {/* Actual progress line */}
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="hsl(var(--chart-1))" 
                strokeWidth={3}
                dot={{ fill: "hsl(var(--chart-1))", r: 5 }}
                activeDot={{ r: 7 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground mb-1">Your Progress</p>
            <p className="text-2xl font-bold text-foreground">
              {((actualWeightChange / totalWeightChange) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {actualWeightChange.toFixed(1)} of {totalWeightChange.toFixed(1)} kg
            </p>
          </div>

          <div className="p-4 rounded-lg bg-primary/10">
            <p className="text-sm text-muted-foreground mb-1">Current Rate</p>
            <p className={`text-2xl font-bold ${
              actualRate > 0 ? 'text-primary' : 'text-muted-foreground'
            }`}>
              {actualRate > 0 ? `${actualRate.toFixed(2)} kg/week` : 'Track more data'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {actualRate < 0.5 ? 'Slower than ideal' : 
               actualRate > 1 ? 'Faster than ideal' : 
               'Healthy pace 👍'}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm text-muted-foreground mb-1">
              {projectedCompletionDate ? 'Projected Completion' : 'Target Completion'}
            </p>
            <p className="text-lg font-bold text-foreground">
              {projectedCompletionDate 
                ? format(projectedCompletionDate, "MMM dd, yyyy")
                : format(effectiveTargetDate, "MMM dd, yyyy")
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {projectedCompletionDate && differenceInDays(projectedCompletionDate, effectiveTargetDate) !== 0 && (
                <>
                  {differenceInDays(projectedCompletionDate, effectiveTargetDate) < 0 
                    ? `${Math.abs(differenceInDays(projectedCompletionDate, effectiveTargetDate))} days ahead 🎉`
                    : `${differenceInDays(projectedCompletionDate, effectiveTargetDate)} days behind`
                  }
                </>
              )}
              {!projectedCompletionDate && 'Target timeline'}
            </p>
          </div>
        </div>

        {!isOnTrack && (
          <div className="mt-4 p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Adjust Your Approach</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You're currently behind the ideal pace. Consider reviewing your meal plan and activity level with Samira to get back on track.
                </p>
              </div>
            </div>
          </div>
        )}

        {isAhead && (
          <div className="mt-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-start gap-2">
              <TrendingDown className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-semibold text-foreground">Outstanding Progress!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You're ahead of your ideal timeline. Keep up the excellent work! Remember to maintain a healthy, sustainable pace.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
