import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { AdminAppointments } from "@/components/AdminAppointments";
import { MealPlansList } from "@/components/MealPlansList";
import { MealPlanEditor } from "@/components/MealPlanEditor";
import { AssignMealPlan } from "@/components/AssignMealPlan";
import { ClientProfiles } from "@/components/ClientProfiles";
import { MealPlanAssignments } from "@/components/MealPlanAssignments";
import { Users, TrendingUp, Calendar, UtensilsCrossed, ClipboardList } from "lucide-react";

interface Client {
  id: string;
  full_name: string;
  email: string;
  dietary_goals: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [mealPlansRefresh, setMealPlansRefresh] = useState(0);
  const [profile, setProfile] = useState({
    full_name: "",
    bio: "",
    credentials: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchClients();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, bio, credentials")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          credentials: data.credentials || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

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
          .select("id, full_name, dietary_goals, created_at")
          .in("id", clientIds);

        if (profilesError) throw profilesError;

        const clientsWithEmails = await Promise.all(
          (profilesData || []).map(async (profile) => {
            const { data: userData } = await supabase.auth.admin.getUserById(profile.id);
            return {
              ...profile,
              email: userData?.user?.email || "N/A",
            };
          })
        );

        setClients(clientsWithEmails as Client[]);
      }
    } catch (error: any) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          bio: profile.bio,
          credentials: profile.credentials,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-outfit text-4xl font-bold text-foreground mb-2">
            Welcome, {profile.full_name || "Sam"}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Your nutrition practice dashboard
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5 text-primary" />
                  Total Clients
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">{clients.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5 text-primary" />
                  Active This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-foreground">{clients.length}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="appointments" className="mb-8">
            <TabsList className="grid w-full grid-cols-4 max-w-3xl">
              <TabsTrigger value="appointments">
                <Calendar className="h-4 w-4 mr-2" />
                Appointments
              </TabsTrigger>
              <TabsTrigger value="meal-plans">
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Meal Plans
              </TabsTrigger>
              <TabsTrigger value="clients">
                <Users className="h-4 w-4 mr-2" />
                Clients
              </TabsTrigger>
              <TabsTrigger value="assignments">
                <ClipboardList className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="appointments" className="mt-6">
              <AdminAppointments />
            </TabsContent>

            <TabsContent value="meal-plans" className="mt-6">
              <MealPlansList
                onCreateNew={() => {
                  setSelectedPlanId(null);
                  setEditorOpen(true);
                }}
                onEdit={(planId) => {
                  setSelectedPlanId(planId);
                  setEditorOpen(true);
                }}
                onAssign={(planId) => {
                  setSelectedPlanId(planId);
                  setAssignOpen(true);
                }}
                refresh={mealPlansRefresh}
              />
            </TabsContent>

            <TabsContent value="clients" className="mt-6">
              <ClientProfiles />
            </TabsContent>

            <TabsContent value="assignments" className="mt-6">
              <MealPlanAssignments />
            </TabsContent>
          </Tabs>

          <MealPlanEditor
            planId={selectedPlanId || undefined}
            open={editorOpen}
            onOpenChange={setEditorOpen}
            onSuccess={() => setMealPlansRefresh(prev => prev + 1)}
          />

          <AssignMealPlan
            mealPlanId={selectedPlanId}
            open={assignOpen}
            onOpenChange={setAssignOpen}
            onSuccess={() => setMealPlansRefresh(prev => prev + 1)}
          />

          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                {isEditing ? "Update your professional information" : "Your profile information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Share your story and approach to nutrition..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credentials">Credentials</Label>
                    <Textarea
                      id="credentials"
                      value={profile.credentials}
                      onChange={(e) => setProfile({ ...profile, credentials: e.target.value })}
                      placeholder="List your qualifications and certifications..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-foreground">{profile.full_name || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Bio</p>
                    <p className="text-foreground">{profile.bio || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Credentials</p>
                    <p className="text-foreground">{profile.credentials || "Not set"}</p>
                  </div>
                  <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
