import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
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
import { Calendar as CalendarIcon, Clock, FileText, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  client_notes: string | null;
  notes: string | null;
}

interface AppointmentsListProps {
  clientId: string;
  refresh?: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
};

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30"
];

export const AppointmentsList = ({ clientId, refresh }: AppointmentsListProps) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState<Date>();
  const [newTime, setNewTime] = useState<string>();
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("client_id", clientId)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [clientId, refresh]);

  const handleCancel = async (id: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "Your appointment has been cancelled successfully.",
      });

      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const handleRescheduleOpen = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setNewDate(new Date(appointment.appointment_date));
    setNewTime(appointment.appointment_time);
    setRescheduleDialogOpen(true);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime || !selectedAppointment) {
      toast({
        title: "Missing Information",
        description: "Please select both a date and time.",
        variant: "destructive",
      });
      return;
    }

    setRescheduleLoading(true);

    try {
      const wasConfirmed = selectedAppointment.status === "confirmed";
      
      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: format(newDate, "yyyy-MM-dd"),
          appointment_time: newTime,
          status: wasConfirmed ? "pending" : selectedAppointment.status,
        })
        .eq("id", selectedAppointment.id);

      if (error) throw error;

      // Send email notification to admin if it was a confirmed appointment
      if (wasConfirmed) {
        try {
          const { data: adminRole } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .limit(1)
            .single();

          const { data: clientProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", clientId)
            .single();

          if (adminRole?.user_id) {
            const { data: adminUser } = await supabase.auth.admin.getUserById(adminRole.user_id);
            const { data: clientUser } = await supabase.auth.admin.getUserById(clientId);
            
            if (adminUser?.user?.email) {
              await supabase.functions.invoke("send-appointment-request-notification", {
                body: {
                  adminEmail: adminUser.user.email,
                  clientName: clientProfile?.full_name || "A client",
                  clientEmail: clientUser?.user?.email || "",
                  appointmentDate: format(newDate, "yyyy-MM-dd"),
                  appointmentTime: newTime,
                  clientNotes: `Rescheduled from ${format(new Date(selectedAppointment.appointment_date), "MMM d, yyyy")} at ${selectedAppointment.appointment_time}`,
                },
              });
            }
          }
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
        }
      }

      toast({
        title: "Appointment Rescheduled",
        description: wasConfirmed 
          ? "Your appointment has been rescheduled and is pending confirmation from Samira."
          : "Your appointment has been updated. Samira will be notified.",
      });

      setRescheduleDialogOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reschedule appointment",
        variant: "destructive",
      });
    } finally {
      setRescheduleLoading(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = date.getDay();
    return date < today || day === 0 || day === 6;
  };

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No appointments scheduled yet</p>
          <p className="text-sm text-muted-foreground mt-2">
            Book your first consultation to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2">
        {appointments.map((appointment) => (
          <Card key={appointment.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">
                    {format(new Date(appointment.appointment_date), "EEEE, MMMM d, yyyy")}
                  </CardTitle>
                </div>
                <Badge className={statusColors[appointment.status]}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{appointment.appointment_time}</span>
                <span className="text-xs">• 60 minutes</span>
              </div>

              {appointment.client_notes && (
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your notes:</p>
                    <p className="text-foreground">{appointment.client_notes}</p>
                  </div>
                </div>
              )}

              {appointment.notes && (
                <div className="bg-accent p-3 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Note from Samira:</p>
                  <p className="text-sm">{appointment.notes}</p>
                </div>
              )}

              {(appointment.status === "pending" || appointment.status === "confirmed") && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRescheduleOpen(appointment)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(appointment.id)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              {selectedAppointment?.status === "confirmed" 
                ? "Rescheduling a confirmed appointment will require Samira's approval again."
                : "Select a new date and time for your consultation with Samira"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <div className="border rounded-lg p-3">
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={isDateDisabled}
                  className={cn("pointer-events-auto")}
                />
              </div>
              {newDate && (
                <p className="text-sm text-muted-foreground">
                  Selected: {format(newDate, "EEEE, MMMM d, yyyy")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Time</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a time slot" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleReschedule}
                disabled={rescheduleLoading || !newDate || !newTime}
              >
                {rescheduleLoading ? "Rescheduling..." : "Confirm Reschedule"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRescheduleDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
