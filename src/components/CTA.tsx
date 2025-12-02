import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      <div className="absolute inset-0 bg-hero-gradient opacity-90" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center animate-in fade-in zoom-in-95 duration-1000">
          <h2 className="font-outfit text-4xl md:text-5xl font-bold mb-6">
            Ready to Start Your Wellness Journey?
          </h2>
          <p className="text-xl mb-8 opacity-95">
            Let's work together to create a personalized nutrition plan that fits your life 
            and helps you achieve your health goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              variant="secondary"
              className="font-outfit text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Calendar className="mr-2 h-5 w-5" />
              Schedule Free Consultation
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="font-outfit text-lg px-8 py-6 rounded-xl border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
            >
              Download Free Guide
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
