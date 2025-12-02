import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, FileText, CheckCircle, XCircle } from "lucide-react";

interface Appointment {
  id: string;
  client_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  client_notes: string | null;
  notes: string | null;
}

interface AppointmentWithClient extends Appointment {
  clientName: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  cancelled: "bg-red-500",
  completed: "bg-blue-500",
};

export const AdminAppointments = () => {
  const [appointments, setAppointments] = useState<AppointmentWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithClient | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();

  const fetchAppointments = async () => {
    try {
      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from("appointments")
        .select("*")
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (appointmentsError) throw appointmentsError;

      // Fetch client names
      const appointmentsWithClients = await Promise.all(
        (appointmentsData || []).map(async (appointment) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", appointment.client_id)
            .maybeSingle();

          return {
            ...appointment,
            clientName: profileData?.full_name || "Unknown Client",
          };
        })
      );

      setAppointments(appointmentsWithClients);
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updateData: any = { status };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Appointment Updated",
        description: `Appointment has been ${status}.`,
      });

      setSelectedAppointment(null);
      setAdminNotes("");
      fetchAppointments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update appointment",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = (appointment: AppointmentWithClient) => {
    setSelectedAppointment(appointment);
    setAdminNotes(appointment.notes || "");
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading appointments...</div>;
  }

  const pendingAppointments = appointments.filter(a => a.status === "pending");
  const upcomingAppointments = appointments.filter(a => a.status === "confirmed");
  const pastAppointments = appointments.filter(a => ["completed", "cancelled"].includes(a.status));

  return (
    <div className="space-y-8">
      {/* Pending Appointments */}
      {pendingAppointments.length > 0 && (
        <div>
          <h3 className="font-outfit text-xl font-bold text-foreground mb-4">
            Pending Requests ({pendingAppointments.length})
          </h3>
          <div className="space-y-4">
            {pendingAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {appointment.clientName}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.appointment_time}
                        </span>
                      </div>
                    </div>
                    <Badge className={statusColors[appointment.status]}>Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {appointment.client_notes && (
                    <div className="flex items-start gap-2 text-sm bg-accent p-3 rounded-lg">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Client notes:</p>
                        <p>{appointment.client_notes}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleOpenDialog(appointment)}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(appointment.id, "cancelled")}
                      className="flex-1 text-destructive hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      {upcomingAppointments.length > 0 && (
        <div>
          <h3 className="font-outfit text-xl font-bold text-foreground mb-4">
            Upcoming ({upcomingAppointments.length})
          </h3>
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => (
              <Card key={appointment.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {appointment.clientName}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(appointment.appointment_date), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {appointment.appointment_time}
                        </span>
                      </div>
                    </div>
                    <Badge className={statusColors[appointment.status]}>Confirmed</Badge>
                  </div>
                </CardHeader>
                {(appointment.client_notes || appointment.notes) && (
                  <CardContent className="space-y-2">
                    {appointment.client_notes && (
                      <div className="text-sm bg-accent p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Client notes:</p>
                        <p>{appointment.client_notes}</p>
                      </div>
                    )}
                    {appointment.notes && (
                      <div className="text-sm bg-primary/10 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Your notes:</p>
                        <p>{appointment.notes}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <div>
          <h3 className="font-outfit text-xl font-bold text-foreground mb-4">
            Past Appointments
          </h3>
          <div className="space-y-4">
            {pastAppointments.slice(0, 5).map((appointment) => (
              <Card key={appointment.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {appointment.clientName}
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{format(new Date(appointment.appointment_date), "MMM d, yyyy")}</span>
                        <span>{appointment.appointment_time}</span>
                      </div>
                    </div>
                    <Badge className={statusColors[appointment.status]}>
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No appointments yet</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Appointment</DialogTitle>
            <DialogDescription>
              Add any notes for the client (optional) and confirm the appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notes for Client</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="E.g., Please bring any recent lab results or food logs..."
                rows={4}
              />
            </div>
            <div className="flex gap-4">
              <Button
                onClick={() =>
                  selectedAppointment &&
                  handleUpdateStatus(selectedAppointment.id, "confirmed", adminNotes)
                }
                className="flex-1"
              >
                Confirm Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => setSelectedAppointment(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
