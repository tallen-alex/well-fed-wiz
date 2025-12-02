import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Users, Calendar } from "lucide-react";

interface MealPlanWithAssignments {
  id: string;
  title: string;
  description: string | null;
  duration_days: number;
  assignments: {
    id: string;
    start_date: string;
    end_date: string | null;
    status: string;
    client: {
      id: string;
      full_name: string | null;
      email?: string;
    };
  }[];
}

export function MealPlanAssignments() {
  const [mealPlans, setMealPlans] = useState<MealPlanWithAssignments[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMealPlanAssignments();
  }, []);

  const fetchMealPlanAssignments = async () => {
    try {
      // Fetch all meal plans
      const { data: plansData, error: plansError } = await supabase
        .from("meal_plans")
        .select("id, title, description, duration_days")
        .order("created_at", { ascending: false });

      if (plansError) throw plansError;

      // Fetch all assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("client_meal_plans")
        .select(`
          id,
          meal_plan_id,
          client_id,
          start_date,
          end_date,
          status
        `);

      if (assignmentsError) throw assignmentsError;

      // Fetch client profiles
      const clientIds = [...new Set(assignmentsData?.map(a => a.client_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", clientIds);

      if (profilesError) throw profilesError;

      // Get emails from auth.users
      const { data: { users } } = await supabase.auth.admin.listUsers();

      // Combine data
      const plansWithAssignments: MealPlanWithAssignments[] = (plansData || []).map((plan) => {
        const planAssignments = assignmentsData?.filter(
          (a) => a.meal_plan_id === plan.id
        ) || [];

        const assignments = planAssignments.map((assignment) => {
          const profile = profilesData?.find((p) => p.id === assignment.client_id);
          const user = users?.find((u: any) => u.id === assignment.client_id);
          
          return {
            id: assignment.id,
            start_date: assignment.start_date,
            end_date: assignment.end_date,
            status: assignment.status,
            client: {
              id: assignment.client_id,
              full_name: profile?.full_name || null,
              email: user?.email,
            },
          };
        });

        return {
          ...plan,
          assignments,
        };
      });

      setMealPlans(plansWithAssignments);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load meal plan assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading assignments...</div>;
  }

  if (mealPlans.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No meal plans created yet
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {mealPlans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{plan.title}</CardTitle>
                  <CardDescription>
                    {plan.description || "No description"}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {plan.duration_days} days
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {plan.assignments.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Not assigned to any clients yet
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Users className="h-4 w-4" />
                    <span>
                      Assigned to {plan.assignments.length}{" "}
                      {plan.assignments.length === 1 ? "client" : "clients"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {plan.assignments.map((assignment) => (
                      <div
                        key={assignment.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {assignment.client.full_name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">
                              {assignment.client.full_name || "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {assignment.client.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(assignment.start_date), "MMM d, yyyy")}
                            </div>
                            {assignment.end_date && (
                              <div className="text-xs">
                                to {format(new Date(assignment.end_date), "MMM d, yyyy")}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={
                              assignment.status === "active"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {assignment.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
