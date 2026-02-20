import { Newspaper } from "lucide-react";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Newspaper className="h-6 w-6 text-primary" />
              <span className="font-display font-bold text-xl">DailyNews</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
              Your daily source for the most important stories from around the world. 
              Curated, verified, and delivered with clarity.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Categories</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/?category=Technology" className="hover:text-primary transition-colors">Technology</Link></li>
              <li><Link href="/?category=Business" className="hover:text-primary transition-colors">Business</Link></li>
              <li><Link href="/?category=Science" className="hover:text-primary transition-colors">Science</Link></li>
              <li><Link href="/?category=Health" className="hover:text-primary transition-colors">Health</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t mt-12 pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DailyNews Portal. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
