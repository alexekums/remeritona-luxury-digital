import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { rooms, formatNaira, getRoom } from "@/data/rooms";
import { Check, CreditCard, Lock } from "lucide-react";
import { z } from "zod";
import PaystackPop from "@paystack/inline-js";

const PAYSTACK_PUBLIC_KEY = "pk_test_a0160de54fc2cf9d624ee9b9451dbe1c8c96f52b";
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-c7659059ed4e5f5f6aa1fbb96055e919-X";

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => void;
  }
}

const search = z.object({
  room: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().optional(),
});

export const Route = createFileRoute("/booking")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Book Your Stay — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Real-time availability and direct booking at Remeritona Hotel and Suites, Abakaliki." },
    ],
  }),
  component: BookingPage,
});

function BookingPage() {
  const sp = Route.useSearch();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(sp.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(sp.checkOut ?? tomorrow);
  const [guests, setGuests] = useState(sp.guests ?? 2);
  const [selectedSlug, setSelectedSlug] = useState(sp.room ?? rooms[0].slug);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", notes: "" });
  const [confirmed, setConfirmed] = useState(false);

  const nights = useMemo(() => {
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    return Math.max(1, Math.round((b - a) / 86400000));
  }, [checkIn, checkOut]);

  const room = getRoom(selectedSlug)!;
  const subtotal = room.price * nights;
  const tax = Math.round(subtotal * 0.075);
  const total = subtotal + tax;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="pt-40 pb-24 px-6">
          <div className="max-w-2xl mx-auto text-center bg-charcoal border border-gold/30 p-12">
            <div className="w-16 h-16 rounded-full bg-gold text-primary-foreground grid place-items-center mx-auto mb-6">
              <Check size={32} />
            </div>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Reservation Confirmed</p>
            <h1 className="font-serif text-4xl mb-4">Welcome to Remeritona, {guest.name.split(" ")[0]}.</h1>
            <p className="text-muted-foreground mb-8">
              A confirmation email is on its way to <span className="text-foreground">{guest.email}</span>. We look forward to hosting you on {new Date(checkIn).toLocaleDateString("en-NG", { dateStyle: "long" })}.
            </p>
            <div className="text-left border-t border-border pt-6 space-y-2 text-sm">
              <Row label="Room" value={room.name} />
              <Row label="Check-in" value={new Date(checkIn).toLocaleDateString()} />
              <Row label="Check-out" value={new Date(checkOut).toLocaleDateString()} />
              <Row label="Nights" value={String(nights)} />
              <Row label="Total Paid" value={formatNaira(total)} highlight />
            </div>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-12 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Reservation</p>
          <h1 className="font-serif text-4xl md:text-5xl mb-8">Book your stay</h1>
          <Stepper step={step} />
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            {step === 1 && (
              <Card title="1. Dates & Guests">
                <div className="grid sm:grid-cols-3 gap-4">
                  <Input label="Check In" type="date" value={checkIn} min={today} onChange={(v) => setCheckIn(v)} />
                  <Input label="Check Out" type="date" value={checkOut} min={checkIn} onChange={(v) => setCheckOut(v)} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs uppercase tracking-widest text-gold">Guests</label>
                    <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                      className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none">
                      {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} className="bg-charcoal">{n} {n === 1 ? "Guest" : "Guests"}</option>)}
                    </select>
                  </div>
                </div>

                <h3 className="font-serif text-2xl mt-8 mb-4">Select a room</h3>
                <div className="space-y-3">
                  {rooms.map((r) => (
                    <button
                      key={r.slug}
                      type="button"
                      onClick={() => setSelectedSlug(r.slug)}
                      className={`w-full text-left flex gap-4 p-3 border transition-colors ${
                        selectedSlug === r.slug ? "border-gold bg-onyx" : "border-border hover:border-gold/40"
                      }`}
                    >
                      <img src={r.image} alt={r.name} className="w-32 h-24 object-cover shrink-0" />
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="font-serif text-lg">{r.name}</p>
                          <p className="text-xs text-muted-foreground">{r.size} · {r.beds} · up to {r.capacity}</p>
                        </div>
                        <p className="text-gold font-serif text-xl">{formatNaira(r.price)}<span className="text-xs text-muted-foreground">/night</span></p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end mt-8">
                  <button onClick={() => setStep(2)} className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft">
                    Continue
                  </button>
                </div>
              </Card>
            )}

            {step === 2 && (
              <Card title="2. Guest details">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Full Name" value={guest.name} onChange={(v) => setGuest({ ...guest, name: v })} required />
                  <Input label="Email" type="email" value={guest.email} onChange={(v) => setGuest({ ...guest, email: v })} required />
                  <Input label="Phone" value={guest.phone} onChange={(v) => setGuest({ ...guest, phone: v })} required />
                </div>
                <div className="mt-4">
                  <label className="text-xs uppercase tracking-widest text-gold">Special requests</label>
                  <textarea value={guest.notes} onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                    rows={3} maxLength={500}
                    className="w-full bg-onyx border border-border px-3 py-2 text-foreground focus:border-gold focus:outline-none mt-1.5" />
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={() => setStep(1)} className="px-6 py-3 border border-border uppercase tracking-widest text-sm hover:border-gold">Back</button>
                  <button
                    onClick={() => guest.name && guest.email && guest.phone && setStep(3)}
                    disabled={!guest.name || !guest.email || !guest.phone}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue to Payment
                  </button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card title="3. Payment">
                <p className="text-muted-foreground mb-6">Secure payment powered by Paystack & Flutterwave. Test mode for now — no card will be charged.</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button className="p-4 border border-gold bg-onyx text-left">
                    <p className="text-xs uppercase tracking-widest text-gold">Paystack</p>
                    <p className="text-sm text-muted-foreground mt-1">Card · Bank · USSD</p>
                  </button>
                  <button className="p-4 border border-border text-left hover:border-gold/40">
                    <p className="text-xs uppercase tracking-widest">Flutterwave</p>
                    <p className="text-sm text-muted-foreground mt-1">Card · Transfer</p>
                  </button>
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="px-6 py-3 border border-border uppercase tracking-widest text-sm hover:border-gold">Back</button>
                  <button
                    onClick={() => setConfirmed(true)}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft inline-flex items-center gap-2">
                    <CreditCard size={16} /> Confirm Booking
                  </button>
                </div>
              </Card>
            )}
          </div>

          <aside>
            <div className="bg-charcoal border border-gold/30 p-6 lg:sticky lg:top-28">
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Reservation Summary</p>
              <img src={room.image} alt={room.name} className="w-full aspect-video object-cover mb-4" />
              <h3 className="font-serif text-xl mb-4">{room.name}</h3>
              <div className="space-y-2 text-sm border-t border-border pt-4">
                <Row label="Check-in" value={new Date(checkIn).toLocaleDateString()} />
                <Row label="Check-out" value={new Date(checkOut).toLocaleDateString()} />
                <Row label="Nights" value={String(nights)} />
                <Row label="Guests" value={String(guests)} />
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                <Row label={`${formatNaira(room.price)} × ${nights} nights`} value={formatNaira(subtotal)} />
                <Row label="Taxes & fees (7.5%)" value={formatNaira(tax)} />
              </div>
              <div className="border-t border-gold/30 mt-4 pt-4">
                <Row label="Total" value={formatNaira(total)} highlight />
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const steps = ["Dates & Room", "Guest Details", "Payment"];
  return (
    <ol className="flex flex-wrap gap-4">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <li key={s} className="flex items-center gap-3">
            <span className={`w-8 h-8 grid place-items-center text-sm border ${
              active ? "bg-gold text-primary-foreground border-gold" : done ? "bg-onyx border-gold text-gold" : "border-border text-muted-foreground"
            }`}>{n}</span>
            <span className={`text-xs uppercase tracking-widest ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-charcoal border border-border p-6 md:p-8">
      <h2 className="font-serif text-2xl mb-6">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, type = "text", value, onChange, min, required }: { label: string; type?: string; value: string; onChange: (v: string) => void; min?: string; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-gold">{label}{required && " *"}</label>
      <input type={type} value={value} min={min} required={required} onChange={(e) => onChange(e.target.value)}
        className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none" />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className={highlight ? "font-serif text-base" : "text-muted-foreground"}>{label}</span>
      <span className={highlight ? "font-serif text-2xl text-gold" : "text-foreground"}>{value}</span>
    </div>
  );
}
