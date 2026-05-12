import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { LANGUAGES } from "@/i18n";

// Google Translate uses two-letter codes; map our app codes to its codes.
const GT_MAP: Record<string, string> = {
  en: "en",
  ig: "ig",
  yo: "yo",
  ha: "ha",
  fr: "fr",
  es: "es",
  it: "it",
};

function setGoogTransCookie(target: string) {
  const value = `/en/${target}`;
  // Set on current host and parent domain so it survives across subdomains.
  document.cookie = `googtrans=${value};path=/`;
  const host = window.location.hostname;
  const parts = host.split(".");
  if (parts.length >= 2) {
    const root = "." + parts.slice(-2).join(".");
    document.cookie = `googtrans=${value};path=/;domain=${root}`;
  }
}

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState<string>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem("lang") || i18n.language || "en";
    setCurrent(stored);
  }, [i18n.language]);

  const change = (code: string) => {
    setCurrent(code);
    i18n.changeLanguage(code);
    if (typeof window === "undefined") return;
    localStorage.setItem("lang", code);

    const target = GT_MAP[code] || "en";
    if (target === "en") {
      // Clear cookie to revert to original.
      document.cookie = "googtrans=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      const host = window.location.hostname;
      const parts = host.split(".");
      if (parts.length >= 2) {
        const root = "." + parts.slice(-2).join(".");
        document.cookie = `googtrans=;path=/;domain=${root};expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      }
    } else {
      setGoogTransCookie(target);
    }
    // Reload so Google Translate re-applies to the entire DOM (incl. dynamic content).
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2 notranslate" translate="no">
      <Globe size={14} className="text-gold" />
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        aria-label="Select language"
        className="bg-transparent text-foreground/85 text-xs uppercase tracking-widest border border-gold/30 px-2 py-1.5 hover:border-gold focus:outline-none focus:border-gold cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="bg-charcoal text-foreground">
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
