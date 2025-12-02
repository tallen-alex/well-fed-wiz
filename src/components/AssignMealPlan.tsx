import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  full_name: string;
}

interface AssignMealPlanProps {
  mealPlanId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AssignMealPlan = ({ mealPlanId, open, onOpenChange, onSuccess }: AssignMealPlanProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const { data: clientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (rolesError) throw rolesError;

      if (clientRoles && clientRoles.length > 0) {
        const clientIds = clientRoles.map((r) => r.user_id);
        
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", clientIds);

        if (profilesError) throw profilesError;

        setClients(profilesData || []);
      }
    } catch (error: any) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    }
  };

  const handleAssign = async () => {
    if (!selectedClientId || !mealPlanId) {
      toast({
        title: "Validation Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("client_meal_plans")
        .insert({
          client_id: selectedClientId,
          meal_plan_id: mealPlanId,
          assigned_by: user?.id,
          start_date: format(startDate, "yyyy-MM-dd"),
          notes: notes || null,
        });

      if (error) throw error;

      // Send email notification
      try {
        // Get client email and meal plan details
        const { data: clientProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", selectedClientId)
          .single();

        const { data: authUser } = await supabase.auth.admin.getUserById(selectedClientId);
        
        const { data: mealPlan } = await supabase
          .from("meal_plans")
          .select("title")
          .eq("id", mealPlanId)
          .single();

        if (authUser?.user?.email && mealPlan) {
          await supabase.functions.invoke("send-meal-plan-notification", {
            body: {
              clientEmail: authUser.user.email,
              clientName: clientProfile?.full_name || "there",
              mealPlanTitle: mealPlan.title,
              startDate: format(startDate, "yyyy-MM-dd"),
              notes: notes || undefined,
            },
          });
        }
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast({
        title: "Success",
        description: "Meal plan assigned successfully!",
      });

      setSelectedClientId("");
      setNotes("");
      setStartDate(new Date());
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign meal plan",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Meal Plan</DialogTitle>
          <DialogDescription>
            Assign this meal plan to a client
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Select Client</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.full_name || "Unknown"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <div className="border rounded-lg p-3">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                className={cn("pointer-events-auto")}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Selected: {format(startDate, "MMMM d, yyyy")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Client (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for the client..."
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button onClick={handleAssign} disabled={loading || !selectedClientId}>
              {loading ? "Assigning..." : "Assign to Client"}
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
