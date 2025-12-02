import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Mail, Phone, Target, Calendar, UtensilsCrossed, MessageSquare, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface ClientProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  dietary_goals: string | null;
  bio: string | null;
  email?: string;
}

interface MealPlanAssignment {
  id: string;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  meal_plan: {
    title: string;
    description: string | null;
    duration_days: number;
  };
}

export function ClientProfiles() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [clientMealPlans, setClientMealPlans] = useState<MealPlanAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientMealPlans(selectedClient);
    }
  }, [selectedClient]);

  const fetchClients = async () => {
    try {
      const { data: clientRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "client");

      if (rolesError) throw rolesError;

      const clientIds = clientRoles?.map((r) => r.user_id) || [];

      if (clientIds.length === 0) {
        setClients([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, dietary_goals, bio")
        .in("id", clientIds);

      if (profilesError) throw profilesError;

      // Get emails from auth.users
      const { data: { users } } = await supabase.auth.admin.listUsers();
      
      const clientsWithEmail: ClientProfile[] = (profiles || []).map((profile) => {
        const user = users?.find((u: any) => u.id === profile.id);
        return {
          ...profile,
          email: user?.email,
        };
      });

      setClients(clientsWithEmail);
      if (clientsWithEmail.length > 0 && !selectedClient) {
        setSelectedClient(clientsWithEmail[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientMealPlans = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("client_meal_plans")
        .select(`
          id,
          start_date,
          end_date,
          status,
          notes,
          meal_plan:meal_plans (
            title,
            description,
            duration_days
          )
        `)
        .eq("client_id", clientId)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setClientMealPlans(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load meal plans",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async () => {
    if (!selectedClient || !messageContent.trim()) return;
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from("messages")
        .insert({
          sender_id: user?.id,
          recipient_id: selectedClient,
          subject: messageSubject.trim() || null,
          message: messageContent.trim(),
        });

      if (error) throw error;

      toast({
        title: "Message sent",
        description: "Your message has been sent to the client.",
      });
      
      setMessageDialogOpen(false);
      setMessageSubject("");
      setMessageContent("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    try {
      const { error } = await supabase
        .from("client_meal_plans")
        .delete()
        .eq("id", assignmentToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Meal plan assignment removed",
      });

      setDeleteDialogOpen(false);
      setAssignmentToDelete(null);
      
      if (selectedClient) {
        fetchClientMealPlans(selectedClient);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to remove assignment",
        variant: "destructive",
      });
    }
  };

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  if (loading) {
    return <div className="text-center py-8">Loading clients...</div>;
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No clients found. Clients will appear here once they sign up.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Client List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Clients</CardTitle>
          <CardDescription>{clients.length} total clients</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client.id)}
              className={`w-full p-3 rounded-lg text-left transition-colors ${
                selectedClient === client.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {client.full_name?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {client.full_name || "Unknown"}
                  </p>
                  <p className="text-sm opacity-80 truncate">{client.email}</p>
                </div>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Client Details */}
      <Card className="md:col-span-2">
        {selectedClientData && (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-2xl">
                      {selectedClientData.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-2xl">
                      {selectedClientData.full_name || "Unknown"}
                    </CardTitle>
                    <CardDescription>Client Profile</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setMessageDialogOpen(true)} size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">Information</TabsTrigger>
                  <TabsTrigger value="meal-plans">
                    Meal Plans ({clientMealPlans.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {selectedClientData.email && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Email</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientData.email}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedClientData.phone && (
                      <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Phone</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientData.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedClientData.dietary_goals && (
                      <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Dietary Goals</p>
                          <p className="text-sm text-muted-foreground">
                            {selectedClientData.dietary_goals}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedClientData.bio && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-1">Bio</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedClientData.bio}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="meal-plans" className="space-y-4 mt-4">
                  {clientMealPlans.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No meal plans assigned yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientMealPlans.map((assignment) => (
                        <Card key={assignment.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <UtensilsCrossed className="h-5 w-5 text-muted-foreground mt-1" />
                                <div className="flex-1">
                                  <h4 className="font-semibold">
                                    {assignment.meal_plan.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {assignment.meal_plan.description}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    assignment.status === "active"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {assignment.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setAssignmentToDelete(assignment.id);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(assignment.start_date), "MMM d, yyyy")}
                              </div>
                              {assignment.end_date && (
                                <>
                                  <span>→</span>
                                  <div>{format(new Date(assignment.end_date), "MMM d, yyyy")}</div>
                                </>
                              )}
                              <span>•</span>
                              <span>{assignment.meal_plan.duration_days} days</span>
                            </div>

                            {assignment.notes && (
                              <p className="mt-3 text-sm text-muted-foreground">
                                Note: {assignment.notes}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </>
        )}
      </Card>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message to {selectedClientData?.full_name}</DialogTitle>
            <DialogDescription>
              Send a message or note to this client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Input
                id="subject"
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message..."
                rows={5}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={sendingMessage || !messageContent.trim()}
              >
                {sendingMessage ? "Sending..." : "Send Message"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Meal Plan Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this meal plan assignment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAssignmentToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAssignment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
