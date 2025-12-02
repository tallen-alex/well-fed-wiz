import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";
import { AppointmentBooking } from "@/components/AppointmentBooking";
import { AppointmentsList } from "@/components/AppointmentsList";
import { TodaysMealPlan } from "@/components/TodaysMealPlan";
import { ClientMessages, ClientMessageInput } from "@/components/ClientMessages";
import { ClientOnboarding } from "@/components/ClientOnboarding";
import { WeightJourneyGraph } from "@/components/WeightJourneyGraph";
import { AchievementBadges } from "@/components/AchievementBadges";
import { GoalComparisonChart } from "@/components/GoalComparisonChart";
import { MealLogger } from "@/components/MealLogger";
import { MealHistory } from "@/components/MealHistory";
import { Calendar, MessageSquare, UtensilsCrossed, User } from "lucide-react";
import wellnessBackground from "@/assets/wellness-background.jpg";

export default function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [appointmentsRefresh, setAppointmentsRefresh] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    phone: "",
    dietary_goals: "",
    age: null as number | null,
    height_cm: null as number | null,
    current_weight_kg: null as number | null,
    target_weight_kg: null as number | null,
    target_date: null as string | null,
    onboarding_completed: false,
  });
  const [weightHistory, setWeightHistory] = useState<Array<{ recorded_date: string; weight_kg: number }>>([]);
  const [mealRefresh, setMealRefresh] = useState(0);

  useEffect(() => {
    if (user) {
      fetchProfile();
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
      console.error("Failed to load weight history:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, dietary_goals, age, height_cm, current_weight_kg, target_weight_kg, target_date, onboarding_completed")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          phone: data.phone || "",
          dietary_goals: data.dietary_goals || "",
          age: data.age,
          height_cm: data.height_cm,
          current_weight_kg: data.current_weight_kg,
          target_weight_kg: data.target_weight_kg,
          target_date: data.target_date,
          onboarding_completed: data.onboarding_completed,
        });

        if (!data.onboarding_completed) {
          setShowOnboarding(true);
        }
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

  const getFirstName = (fullName: string) => {
    return fullName.split(" ")[0];
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div 
        className="fixed inset-0 z-0 opacity-30"
        style={{
          backgroundImage: `url(${wellnessBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
        }}
      />
      
      <div className="relative z-10">
        <Navbar />
        
        {showOnboarding && (
          <ClientOnboarding 
            onComplete={() => {
              setShowOnboarding(false);
              fetchProfile();
            }} 
          />
        )}
        
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="font-outfit text-4xl font-bold text-foreground mb-2">
              Welcome back, {profile.full_name ? getFirstName(profile.full_name) : "Client"}!
            </h1>
            <p className="text-muted-foreground mb-8">
              Here&apos;s your personalized nutrition dashboard
            </p>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4 backdrop-blur-sm bg-card/95">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="weight">Weight</TabsTrigger>
                <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="hover:shadow-lg transition-shadow backdrop-blur-sm bg-card/95 flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-primary" />
                        Book Consultation
                      </CardTitle>
                      <CardDescription>Schedule your next session with Samira</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                      <div className="flex-1">
                        <AppointmentsList clientId={user?.id || ""} refresh={appointmentsRefresh} />
                      </div>
                      <Button className="w-full" onClick={() => setBookingOpen(true)}>
                        Schedule New Appointment
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-shadow backdrop-blur-sm bg-card/95 flex flex-col">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <MessageSquare className="mr-2 h-5 w-5 text-primary" />
                        Messages
                      </CardTitle>
                      <CardDescription>Chat with Samira</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-4">
                      <div className="flex-1 max-h-[260px]">
                        <ClientMessages />
                      </div>
                      <ClientMessageInput />
                    </CardContent>
                  </Card>
                </div>

                <Card className="backdrop-blur-sm bg-card/95">
                  <CardHeader>
                    <CardTitle>Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 rounded-lg bg-primary/10">
                        <p className="text-sm text-muted-foreground mb-1">Current Weight</p>
                        <p className="text-2xl font-bold text-primary">
                          {profile.current_weight_kg ? `${profile.current_weight_kg} kg` : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Target Weight</p>
                        <p className="text-2xl font-bold">
                          {profile.target_weight_kg ? `${profile.target_weight_kg} kg` : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">BMI</p>
                        <p className="text-2xl font-bold">
                          {profile.height_cm && profile.current_weight_kg 
                            ? (profile.current_weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
                            : "—"}
                        </p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground mb-1">Height</p>
                        <p className="text-2xl font-bold">
                          {profile.height_cm ? `${profile.height_cm} cm` : "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="mt-6">
                <Card className="backdrop-blur-sm bg-card/95">
                  <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>
                      {isEditing ? "Update your information below" : "Your current profile information"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
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
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={profile.phone}
                              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                              placeholder="(555) 123-4567"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dietary_goals">Dietary Goals</Label>
                          <Textarea
                            id="dietary_goals"
                            value={profile.dietary_goals}
                            onChange={(e) => setProfile({ ...profile, dietary_goals: e.target.value })}
                            placeholder="Share your health and nutrition goals..."
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
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Name</p>
                            <p className="text-foreground">{profile.full_name || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Phone</p>
                            <p className="text-foreground">{profile.phone || "Not set"}</p>
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                          <h3 className="font-semibold mb-3 text-foreground">Health Metrics</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Age</p>
                              <p className="text-foreground font-semibold">{profile.age ? `${profile.age} years` : "Not set"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Height</p>
                              <p className="text-foreground font-semibold">{profile.height_cm ? `${profile.height_cm} cm` : "Not set"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Current Weight</p>
                              <p className="text-foreground font-semibold">{profile.current_weight_kg ? `${profile.current_weight_kg} kg` : "Not set"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Target Weight</p>
                              <p className="text-foreground font-semibold">{profile.target_weight_kg ? `${profile.target_weight_kg} kg` : "Not set"}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">BMI</p>
                              <p className="text-foreground font-semibold">
                                {profile.height_cm && profile.current_weight_kg 
                                  ? (() => {
                                      const bmi = profile.current_weight_kg / Math.pow(profile.height_cm / 100, 2);
                                      const category = bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese";
                                      return `${bmi.toFixed(1)} (${category})`;
                                    })()
                                  : "Not set"}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Dietary Goals</p>
                          <p className="text-foreground">{profile.dietary_goals || "Not set"}</p>
                        </div>
                        <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="weight" className="mt-6 space-y-6">
                <WeightJourneyGraph 
                  targetWeight={profile.target_weight_kg || undefined}
                  onWeightAdded={fetchWeightHistory}
                />
                <GoalComparisonChart
                  weightHistory={weightHistory}
                  startWeight={weightHistory.length > 0 ? weightHistory[0].weight_kg : profile.current_weight_kg || undefined}
                  targetWeight={profile.target_weight_kg || undefined}
                  targetDate={profile.target_date ? new Date(profile.target_date) : undefined}
                  userId={user?.id}
                  onTargetDateUpdate={fetchProfile}
                />
                <AchievementBadges 
                  weightHistory={weightHistory}
                  startWeight={profile.current_weight_kg || undefined}
                  targetWeight={profile.target_weight_kg || undefined}
                />
              </TabsContent>

              <TabsContent value="nutrition" className="mt-6 space-y-6">
                <TodaysMealPlan onMealCompleted={() => setMealRefresh(prev => prev + 1)} />
                <MealLogger onMealLogged={() => setMealRefresh(prev => prev + 1)} />
                <MealHistory refresh={mealRefresh} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      <AppointmentBooking 
        open={bookingOpen} 
        onOpenChange={setBookingOpen}
        onSuccess={() => {
          setAppointmentsRefresh(prev => prev + 1);
        }}
      />
    </div>
  );
}
