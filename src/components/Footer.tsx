import { Heart } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-outfit font-bold text-xl mb-4 text-foreground">
              NutriBalance
            </h3>
            <p className="text-muted-foreground">
              Expert nutrition guidance for a healthier, balanced life.
            </p>
          </div>
          
          <div>
            <h4 className="font-outfit font-semibold mb-4 text-foreground">Services</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Consultations</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Meal Planning</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Weight Management</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Disease Management</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-outfit font-semibold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Recipes</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQs</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-outfit font-semibold mb-4 text-foreground">Connect</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Facebook</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">LinkedIn</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">YouTube</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center text-muted-foreground flex items-center justify-center gap-2">
          <span>© 2024 NutriBalance. Made with</span>
          <Heart className="h-4 w-4 text-primary fill-primary" />
          <span>for your health.</span>
        </div>
      </div>
    </footer>
  );
};
