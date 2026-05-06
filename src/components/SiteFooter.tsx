import { Instagram, MapPin, Phone } from "lucide-react";
import logo from "@/assets/logo.png";

export function SiteFooter() {
  return (
    <footer className="bg-onyx border-t border-gold/20">
      <div className="max-w-7xl mx-auto px-6 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <img src={logo} alt="Re Meritona Hotel & Suites" className="w-32 h-auto mb-4" />
          <p className="text-gold italic font-serif text-lg">...love and refreshment</p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Visit Us</h4>
          <a
            href="https://maps.app.goo.gl/33gu77pu9tyD5gvK6"
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            <MapPin size={16} className="text-gold mt-0.5 shrink-0" />
            41 Igweliga Street, Abakaliki, Ebonyi State
          </a>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Call Us</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="tel:09122999845" className="flex gap-2 text-muted-foreground hover:text-gold transition-colors">
                <Phone size={16} className="text-gold mt-0.5 shrink-0" /> 0912 299 9845
              </a>
            </li>
            <li>
              <a href="tel:09130844222" className="flex gap-2 text-muted-foreground hover:text-gold transition-colors">
                <Phone size={16} className="text-gold mt-0.5 shrink-0" /> 0913 084 4222
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-widest text-gold mb-4">Follow</h4>
          <a
            href="https://instagram.com/remeritona_hotel_abakaliki"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-gold transition-colors"
          >
            <Instagram size={18} className="text-gold" /> @remeritona_hotel_abakaliki
          </a>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-muted-foreground text-center space-y-1">
          <p>© 2026 Re Meritona Hotel & Suites. All rights reserved.</p>
          <p className="text-gold">
            Designed by{" "}
            <a
              href="https://wa.me/2349169616205"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gold-soft"
            >
              Lex TX
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
