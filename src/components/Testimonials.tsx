import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Weight Loss Success",
    content: "I lost 30 pounds and gained so much confidence! The personalized meal plans made it easy to stay on track, and I never felt deprived.",
    rating: 5,
  },
  {
    name: "James Chen",
    role: "Diabetes Management",
    content: "My blood sugar levels are finally stable. The nutrition guidance has been life-changing and my doctor is thrilled with my progress.",
    rating: 5,
  },
  {
    name: "Emily Rodriguez",
    role: "Athletic Performance",
    content: "My energy levels and athletic performance have improved dramatically. The nutrition strategies are practical and effective.",
    rating: 5,
  },
];

export const Testimonials = () => {
  return (
    <section id="testimonials" className="py-24 bg-accent-gradient">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h2 className="font-outfit text-4xl md:text-5xl font-bold mb-4 text-foreground">
            Success Stories
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Real results from real people transforming their health
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index}
              className="p-8 hover:shadow-xl transition-all duration-300 border-border bg-card animate-in fade-in slide-in-from-bottom-8 duration-1000"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed italic">
                "{testimonial.content}"
              </p>
              <div className="border-t border-border pt-4">
                <p className="font-outfit font-semibold text-foreground">
                  {testimonial.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {testimonial.role}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
