import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-nutrition.jpg";

export const Hero = () => {
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, hsl(var(--background) / 0.95) 0%, hsl(var(--background) / 0.85) 50%, transparent 100%), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl animate-in fade-in slide-in-from-left-8 duration-1000">
          <h1 className="font-outfit text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground leading-tight">
            Nourish Your Body,
            <span className="block text-primary mt-2">Transform Your Life</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Expert nutrition guidance from Sam. Personalized plans designed for your unique 
            lifestyle and goals. Let's build healthier habits together.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg" 
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-outfit text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              <Link to="/auth">
                Book a Consultation
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              asChild
              className="font-outfit text-lg px-8 py-6 rounded-xl border-2 hover:bg-accent"
            >
              <a href="#about">Learn More</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
