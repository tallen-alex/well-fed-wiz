import { Card } from "@/components/ui/card";
import { Users, Apple, Activity, Heart } from "lucide-react";

const services = [
  {
    icon: Users,
    title: "One-on-One Consultations",
    description: "Personalized nutrition assessments and custom meal plans tailored to your specific needs and goals.",
  },
  {
    icon: Apple,
    title: "Meal Planning",
    description: "Comprehensive meal plans with delicious, nutritious recipes that fit your lifestyle and preferences.",
  },
  {
    icon: Activity,
    title: "Weight Management",
    description: "Evidence-based strategies for sustainable weight loss or gain, focusing on long-term health.",
  },
  {
    icon: Heart,
    title: "Chronic Disease Management",
    description: "Specialized nutrition support for diabetes, heart disease, digestive disorders, and more.",
  },
];

export const Services = () => {
  return (
    <section className="py-24 bg-accent-gradient">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h2 className="font-outfit text-4xl md:text-5xl font-bold mb-4 text-foreground">
            How I Can Help You
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive nutrition services designed to support your wellness journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index}
                className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-border bg-card animate-in fade-in slide-in-from-bottom-8 duration-1000"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-outfit text-xl font-semibold mb-3 text-foreground">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
