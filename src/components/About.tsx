import { Button } from "@/components/ui/button";
import aboutImage from "@/assets/about-consultation.jpg";

export const About = () => {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
            <img 
              src={aboutImage} 
              alt="Nutritionist consultation" 
              className="rounded-3xl shadow-2xl w-full h-auto object-cover"
            />
          </div>
          
          <div className="animate-in fade-in slide-in-from-right-8 duration-1000">
            <h2 className="font-outfit text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Meet Your Nutritionist
            </h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              With over 10 years of experience in nutrition science and wellness coaching, 
              I'm passionate about helping people discover the transformative power of 
              proper nutrition.
            </p>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              My approach combines evidence-based nutritional science with practical, 
              sustainable lifestyle changes. I believe that healthy eating should be 
              enjoyable, not restrictive.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                <p className="text-muted-foreground">Registered Dietitian Nutritionist (RDN)</p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                <p className="text-muted-foreground">Certified Nutrition Specialist (CNS)</p>
              </div>
              <div className="flex items-start">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 mr-3 flex-shrink-0" />
                <p className="text-muted-foreground">Master's Degree in Nutritional Science</p>
              </div>
            </div>
            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-outfit text-lg px-8 rounded-xl"
            >
              Read My Full Story
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
