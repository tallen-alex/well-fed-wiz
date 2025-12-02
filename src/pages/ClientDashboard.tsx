import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { AppointmentBooking } from "@/components/AppointmentBooking";
import { AppointmentsList } from "@/components/AppointmentsList";
import { Calendar, MessageSquare, UtensilsCrossed, User } from "lucide-react";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [appointmentsRefresh, setAppointmentsRefresh] = useState(0);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    dietary_goals: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, dietary_goals")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          dietary_goals: data.dietary_goals || "",
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          dietary_goals: profile.dietary_goals,
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
        <div className="max-w-4xl mx-auto">
          <h1 className="font-outfit text-4xl font-bold text-foreground mb-2">
            Welcome back, {profile.full_name || "Client"}!
          </h1>
          <p className="text-muted-foreground mb-8">
            Here's your personalized nutrition dashboard
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-primary" />
                  Book Consultation
                </CardTitle>
                <CardDescription>Schedule your next session with Sam</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => setBookingOpen(true)}>
                  Schedule Appointment
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UtensilsCrossed className="mr-2 h-5 w-5 text-primary" />
                  Meal Plans
                </CardTitle>
                <CardDescription>View your personalized meal plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Meal Plans</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                  Message Sam
                </CardTitle>
                <CardDescription>Get answers to your questions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Send Message</Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-primary" />
                  My Profile
                </CardTitle>
                <CardDescription>Update your information</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? "Cancel" : "Edit Profile"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h2 className="font-outfit text-2xl font-bold text-foreground mb-4">
              Your Appointments
            </h2>
            <AppointmentsList clientId={user?.id || ""} refresh={appointmentsRefresh} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                {isEditing ? "Update your information below" : "Your current profile information"}
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
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dietary_goals">Dietary Goals</Label>
                    <Textarea
                      id="dietary_goals"
                      value={profile.dietary_goals}
                      onChange={(e) => setProfile({ ...profile, dietary_goals: e.target.value })}
                      placeholder="E.g., Weight loss, muscle gain, better energy..."
                      rows={4}
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
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p className="text-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Phone</p>
                    <p className="text-foreground">{profile.phone || "Not set"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Dietary Goals</p>
                    <p className="text-foreground">{profile.dietary_goals || "Not set"}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <AppointmentBooking
            open={bookingOpen}
            onOpenChange={setBookingOpen}
            onSuccess={() => setAppointmentsRefresh(prev => prev + 1)}
          />
        </div>
      </div>
    </div>
  );
}
