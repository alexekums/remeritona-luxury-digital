import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { LANGUAGES } from "@/i18n";

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language || "en";

  const change = (code: string) => {
    i18n.changeLanguage(code);
    if (typeof window !== "undefined") localStorage.setItem("lang", code);
  };

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : ""}`}>
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
