import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Twitter, MapPin, Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-onyx border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <h3 className="font-serif text-2xl text-gold mb-3">Remeritona</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A sanctuary of industrial-chic luxury in the heart of Abakaliki, Ebonyi State.
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/rooms" className="hover:text-gold">Rooms & Suites</Link></li>
            <li><Link to="/offers" className="hover:text-gold">Special Offers</Link></li>
            <li><Link to="/dining" className="hover:text-gold">Dining</Link></li>
            <li><Link to="/gallery" className="hover:text-gold">Gallery</Link></li>
            <li><Link to="/about" className="hover:text-gold">Our Story</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Contact</h4>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex gap-2"><MapPin size={16} className="text-gold mt-0.5 shrink-0" /> Refinery Road, Abakaliki, Ebonyi State, Nigeria</li>
            <li className="flex gap-2"><Phone size={16} className="text-gold mt-0.5 shrink-0" /> +234 800 123 4567</li>
            <li className="flex gap-2"><Mail size={16} className="text-gold mt-0.5 shrink-0" /> info@remeritona.com</li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Follow</h4>
          <div className="flex gap-3">
            <a href="#" aria-label="Instagram" className="w-10 h-10 grid place-items-center border border-border hover:border-gold hover:text-gold transition-colors"><Instagram size={18} /></a>
            <a href="#" aria-label="Facebook" className="w-10 h-10 grid place-items-center border border-border hover:border-gold hover:text-gold transition-colors"><Facebook size={18} /></a>
            <a href="#" aria-label="Twitter" className="w-10 h-10 grid place-items-center border border-border hover:border-gold hover:text-gold transition-colors"><Twitter size={18} /></a>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <p>© {new Date().getFullYear()} Remeritona Hotel and Suites. All rights reserved.</p>
          <p>Crafted with elegance in Ebonyi State.</p>
        </div>
      </div>
    </footer>
  );
}
