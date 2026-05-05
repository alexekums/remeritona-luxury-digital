import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, Users } from "lucide-react";

export function BookingWidget({ variant = "hero" }: { variant?: "hero" | "inline" }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/booking", search: { checkIn, checkOut, guests } as never });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`grid grid-cols-1 md:grid-cols-4 gap-3 p-5 ${
        variant === "hero" ? "bg-onyx/85 backdrop-blur border border-gold/30 shadow-elegant" : "bg-charcoal border border-border"
      }`}
    >
      <Field icon={<Calendar size={16} />} label="Check In">
        <input
          type="date"
          value={checkIn}
          min={today}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full bg-transparent text-foreground text-sm focus:outline-none"
        />
      </Field>
      <Field icon={<Calendar size={16} />} label="Check Out">
        <input
          type="date"
          value={checkOut}
          min={checkIn}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full bg-transparent text-foreground text-sm focus:outline-none"
        />
      </Field>
      <Field icon={<Users size={16} />} label="Guests">
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full bg-transparent text-foreground text-sm focus:outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n} className="bg-charcoal">
              {n} {n === 1 ? "Guest" : "Guests"}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="submit"
        className="bg-gold text-primary-foreground font-semibold text-sm uppercase tracking-widest hover:bg-gold-soft transition-colors py-3"
      >
        Check Availability
      </button>
    </form>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 px-3 py-2 border border-border bg-onyx/40">
      <span className="text-[10px] uppercase tracking-widest text-gold flex items-center gap-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
