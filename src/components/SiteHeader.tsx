import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { to: "/", label: "Home" },
  { to: "/rooms", label: "Rooms" },
  { to: "/offers", label: "Offers" },
  { to: "/dining", label: "Dining" },
  { to: "/gallery", label: "Gallery" },
  { to: "/about", label: "About" },
  { to: "/policies", label: "Policies" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-onyx/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="font-serif text-2xl font-bold text-gold tracking-wide">REMERITONA</span>
          <span className="text-[10px] tracking-[0.3em] text-foreground/70 uppercase">Hotel & Suites</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm uppercase tracking-widest transition-colors hover:text-gold ${
                path === l.to ? "text-gold" : "text-foreground/85"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:block">
          <Link
            to="/booking"
            className="px-6 py-2.5 bg-gold text-primary-foreground font-semibold text-sm uppercase tracking-widest hover:bg-gold-soft transition-colors shadow-gold"
          >
            Book Now
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          className="lg:hidden text-foreground"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-onyx/95 border-t border-border">
          <nav className="flex flex-col px-6 py-4 gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-widest py-2 hover:text-gold"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/booking"
              onClick={() => setOpen(false)}
              className="mt-2 text-center px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest"
            >
              Book Now
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
