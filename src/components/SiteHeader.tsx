import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const GUEST_PORTAL_URL = "https://remeritona-guest-portal.remeritona.workers.dev/";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/rooms", label: t("nav.rooms") },
    { to: "/offers", label: t("nav.offers") },
    { to: "/dining", label: t("nav.dining") },
    { to: "/gallery", label: t("nav.gallery") },
    { to: "/about", label: t("nav.about") },
    { to: "/policies", label: t("nav.policies") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header className="absolute top-0 left-0 right-0 z-50 bg-onyx/40 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
        <Link to="/" className="flex flex-col leading-tight">
          <span className="font-serif text-2xl font-bold text-gold tracking-wide">REMERITONA</span>
          <span className="text-[10px] tracking-[0.3em] text-foreground/70 uppercase">Hotel & Suites</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-7">
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
          <a
            href={GUEST_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm uppercase tracking-widest text-foreground/85 hover:text-gold inline-flex items-center gap-1.5"
          >
            <KeyRound size={14} /> {t("nav.guestPortal")}
          </a>
        </nav>

        <div className="hidden xl:flex items-center gap-4">
          <LanguageSwitcher />
          <Link
            to="/booking"
            className="px-6 py-2.5 bg-gold text-primary-foreground font-semibold text-sm uppercase tracking-widest hover:bg-gold-soft transition-colors shadow-gold"
          >
            {t("nav.bookNow")}
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          className="xl:hidden text-foreground"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {open && (
        <div className="xl:hidden bg-onyx/95 border-t border-border">
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
            <a
              href={GUEST_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="text-sm uppercase tracking-widest py-2 text-gold inline-flex items-center gap-2"
            >
              <KeyRound size={14} /> {t("nav.guestPortal")}
            </a>
            <div className="py-2">
              <LanguageSwitcher />
            </div>
            <Link
              to="/booking"
              onClick={() => setOpen(false)}
              className="mt-2 text-center px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest"
            >
              {t("nav.bookNow")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
