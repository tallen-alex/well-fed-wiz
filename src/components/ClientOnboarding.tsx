import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import samiraCharacter from "@/assets/samira-character.png";

interface OnboardingData {
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
}

interface ClientOnboardingProps {
  onComplete: () => void;
}

export function ClientOnboarding({ onComplete }: ClientOnboardingProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    age: null,
    height_cm: null,
    current_weight_kg: null,
    target_weight_kg: null,
  });

  const steps = [
    {
      title: "Welcome! I'm Samira 👋",
      description: "Your personal nutrition guide! I'm here to help you achieve your health goals. Let's get to know each other!",
      showForm: false,
    },
    {
      title: "Tell me about yourself",
      description: "This helps me personalize your nutrition plan",
      showForm: true,
    },
    {
      title: "Quick Tour 🎯",
      description: "📅 Book consultations\n💬 Message me anytime\n🍽️ View your meal plans\n📊 Track your progress",
      showForm: false,
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    if (!data.age || !data.height_cm || !data.current_weight_kg || !data.target_weight_kg) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          age: data.age,
          height_cm: data.height_cm,
          current_weight_kg: data.current_weight_kg,
          target_weight_kg: data.target_weight_kg,
          onboarding_completed: true,
        })
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // Add initial weight record
      const { error: weightError } = await supabase
        .from("weight_history")
        .insert({
          user_id: user?.id,
          weight_kg: data.current_weight_kg,
          notes: "Initial weight",
        });

      if (weightError) throw weightError;

      toast({
        title: "Welcome aboard! 🎉",
        description: "Your profile is all set up!",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to complete onboarding",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="max-w-2xl w-full animate-scale-in">
        <CardHeader className="text-center relative">
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-32 h-32 animate-bounce">
            <img 
              src={samiraCharacter} 
              alt="Samira" 
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </div>
          <div className="mt-20">
            <CardTitle className="text-3xl font-outfit flex items-center justify-center gap-2">
              {steps[step].title}
              {step === 0 && <Sparkles className="h-6 w-6 text-primary animate-pulse" />}
            </CardTitle>
            <CardDescription className="text-lg mt-2 whitespace-pre-line">
              {steps[step].description}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {steps[step].showForm ? (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    value={data.age || ""}
                    onChange={(e) => setData({ ...data, age: parseInt(e.target.value) || null })}
                    placeholder="25"
                    min="1"
                    max="120"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm) *</Label>
                  <Input
                    id="height"
                    type="number"
                    value={data.height_cm || ""}
                    onChange={(e) => setData({ ...data, height_cm: parseFloat(e.target.value) || null })}
                    placeholder="170"
                    min="50"
                    max="300"
                    step="0.1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_weight">Current Weight (kg) *</Label>
                  <Input
                    id="current_weight"
                    type="number"
                    value={data.current_weight_kg || ""}
                    onChange={(e) => setData({ ...data, current_weight_kg: parseFloat(e.target.value) || null })}
                    placeholder="70"
                    min="20"
                    max="500"
                    step="0.1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_weight">Target Weight (kg) *</Label>
                  <Input
                    id="target_weight"
                    type="number"
                    value={data.target_weight_kg || ""}
                    onChange={(e) => setData({ ...data, target_weight_kg: parseFloat(e.target.value) || null })}
                    placeholder="65"
                    min="20"
                    max="500"
                    step="0.1"
                    required
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between mt-6">
            <div className="flex gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    index === step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              )}
              <Button onClick={handleNext} disabled={loading}>
                {loading ? "Saving..." : step === steps.length - 1 ? "Let's Go! 🚀" : "Next"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
