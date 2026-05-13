import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { rooms, formatNaira, getRoom } from "@/data/rooms";
import { applyCoupon, type CouponResult } from "@/data/coupons";
import { Check, CreditCard, Lock, Plus, Users, Briefcase, User, Tag, X, Clock, Wallet } from "lucide-react";
import { z } from "zod";
import { Resend } from 'resend';
import BookingEmail from "@/components/BookingEmail";
import { saveBooking, type StoredBooking } from "@/data/bookings-store";

const TOKENIZATION_FEE = 100; // NGN — small Save-card-now charge to capture authorization
const SAVE_CARD_MIN_HOURS = 72;

// Initialize Resend
const resend = new Resend("re_H329kVbZ_6HHvRmnyuFcW3nM4MQT9w1mF");

const PAYSTACK_PUBLIC_KEY = "pk_test_a0160de54fc2cf9d624ee9b9451dbe1c8c96f52b";
const FLUTTERWAVE_PUBLIC_KEY = "FLWPUBK_TEST-c7659059ed4e5f5f6aa1fbb96055e919-X";

// ==================== ADD-ONS (Pay on Arrival) ====================
const ADD_ONS = [
  { id: "pickup_morning", label: "Venue Pickup (Every Morning)", price: 7000 },
  { id: "drop", label: "Venue Drop", price: 7000 },
  { id: "full_transfer", label: "Airport Pickup + Drop", price: 100000 },
  { id: "flowers", label: "Bouquet of Flowers in Room", price: 25000 },
  { id: "breakfast", label: "Breakfast Included (Per Person)", price: 5500 },
  { id: "cake", label: "Cake & Decoration", price: 30000 },
  { id: "champagne", label: "Champagne on Arrival", price: 250000 },
] as const;
// ===============================================================

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: Record<string, unknown>) => { close: () => void };
    PaystackPop?: {
      setup: (config: Record<string, unknown>) => { openIframe: () => void };
    };
  }
}

const search = z.object({
  room: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.coerce.number().optional(),
  adults: z.coerce.number().optional(),
  children: z.coerce.number().optional(),
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
  const [bookingType, setBookingType] = useState<"self" | "family" | "corporate">("self");
  const [numRooms, setNumRooms] = useState<number>(1);

  // "Book for myself" always uses 1 room.
  useEffect(() => {
    if (bookingType === "self" && numRooms !== 1) setNumRooms(1);
  }, [bookingType, numRooms]);

  const maxAdults = 2 * numRooms;
  const maxChildren = 1 * numRooms;

  const [adults, setAdults] = useState<number>(
    typeof sp.adults === "number" && Number.isFinite(sp.adults) ? Math.max(1, sp.adults) : 1
  );
  const [children, setChildren] = useState<number>(
    typeof sp.children === "number" && Number.isFinite(sp.children) ? Math.max(0, sp.children) : 0
  );

  // For "self" bookings, force 1 adult / 0 children. Otherwise clamp to current max.
  const effAdults = bookingType === "self" ? 1 : Math.min(adults, maxAdults);
  const effChildren = bookingType === "self" ? 0 : Math.min(children, maxChildren);
  const guests = effAdults + effChildren;

  useEffect(() => {
    if (adults > maxAdults) setAdults(maxAdults);
    if (children > maxChildren) setChildren(maxChildren);
  }, [maxAdults, maxChildren, adults, children]);

  const [selectedSlug, setSelectedSlug] = useState(sp.room ?? rooms[0].slug);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", notes: "" });
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showAllAddons, setShowAllAddons] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"paystack" | "flutterwave">("paystack");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paystackReady, setPaystackReady] = useState(false);
  const [showPaymentChoice, setShowPaymentChoice] = useState(false);
  const [savedReceipt, setSavedReceipt] = useState<StoredBooking | null>(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);

  const stepRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

  // On mobile, scroll to the summary panel (where the second Continue lives).
  // On desktop, scroll to the next form section.
  const scrollToStep = () => {
    setTimeout(() => {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
      const target = isMobile ? summaryRef.current : stepRef.current;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // For the second (mobile) Continue under the summary — always scroll to the form.
  const scrollToForm = () => {
    setTimeout(() => {
      stepRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  // Load Flutterwave script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("flutterwave-checkout-script")) return;
    const s = document.createElement("script");
    s.id = "flutterwave-checkout-script";
    s.src = "https://checkout.flutterwave.com/v3.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  // Load Paystack script properly
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (document.getElementById("paystack-script")) {
      setPaystackReady(true);
      return;
    }
    const s = document.createElement("script");
    s.id = "paystack-script";
    s.src = "https://js.paystack.co/v1/inline.js";
    s.async = true;
    s.onload = () => setPaystackReady(true);
    document.body.appendChild(s);
  }, []);

  const nights = useMemo(() => {
    const a = new Date(checkIn).getTime();
    const b = new Date(checkOut).getTime();
    return Math.max(1, Math.round((b - a) / 86400000));
  }, [checkIn, checkOut]);

  const room = getRoom(selectedSlug)!;
  const subtotal = room.price * nights * numRooms;

  const discount = couponResult && couponResult.valid ? couponResult.discount : 0;
  const taxableBase = Math.max(0, subtotal - discount);
  const tax = Math.round(taxableBase * 0.075);

  const addonsTotal = useMemo(() => {
    return selectedAddons.reduce((sum, id) => {
      const addon = ADD_ONS.find(a => a.id === id);
      return sum + (addon?.price || 0);
    }, 0);
  }, [selectedAddons]);

  const total = taxableBase + tax + addonsTotal;

  // Re-validate coupon when stay dates / subtotal change.
  useEffect(() => {
    if (!couponResult || !couponResult.valid) return;
    const re = applyCoupon(couponCode, { checkIn, checkOut, subtotal, nights });
    setCouponResult(re);
  }, [checkIn, checkOut, subtotal, nights]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    const result = applyCoupon(couponCode, { checkIn, checkOut, subtotal, nights });
    setCouponResult(result);
  };

  const removeCoupon = () => {
    setCouponCode("");
    setCouponResult(null);
  };


  const toggleAddon = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  // ==================== NEW: SEND BOOKING EMAILS ====================
  const sendBookingEmails = async (reference: string) => {
    const selectedAddonDetails = selectedAddons.map(id => {
      const addon = ADD_ONS.find(a => a.id === id);
      return { label: addon?.label || "", price: addon?.price || 0 };
    });

    const emailData = {
      guestName: guest.name,
      roomName: room.name,
      checkIn: new Date(checkIn).toLocaleDateString("en-NG", { dateStyle: "long" }),
      checkOut: new Date(checkOut).toLocaleDateString("en-NG", { dateStyle: "long" }),
      nights,
      guests,
      total,
      addons: selectedAddonDetails,
      notes: guest.notes,
      reference,
    };

    try {
      // Send to Guest
      await resend.emails.send({
        from: "Remeritona Hotel <onboarding@resend.dev>",
        to: guest.email,
        subject: `Booking Confirmed - ${room.name}`,
        react: BookingEmail(emailData),
      });

      // Send to Hotel (alexekums@gmail.com)
      await resend.emails.send({
        from: "Remeritona Hotel <onboarding@resend.dev>",
        to: "alexekums@gmail.com",
        subject: `New Booking Alert - ${guest.name}`,
        html: `
          <h2>New Booking Received</h2>
          <p><strong>Guest:</strong> ${guest.name}</p>
          <p><strong>Email:</strong> ${guest.email}</p>
          <p><strong>Phone:</strong> ${guest.phone}</p>
          <p><strong>Room:</strong> ${room.name}</p>
          <p><strong>Dates:</strong> ${emailData.checkIn} - ${emailData.checkOut} (${nights} nights)</p>
          <p><strong>Total Paid:</strong> ${formatNaira(total)}</p>
          <p><strong>Add-ons:</strong> ${selectedAddonDetails.map(a => a.label).join(", ") || "None"}</p>
          <p><strong>Special Requests:</strong> ${guest.notes || "None"}</p>
          <p><strong>Reference:</strong> ${reference}</p>
        `,
      });
    } catch (error) {
      console.error("Failed to send emails:", error);
    }
  };
  // ============================================================

    const handlePaystack = () => {
    setPaymentError(null);

    if (!paystackReady || !window.PaystackPop) {
      setPaymentError("Paystack is still loading. Please wait a moment and try again.");
      return;
    }

    if (!guest.email) {
      setPaymentError("Please go back and enter your email address.");
      return;
    }

    try {
      const [firstName, ...rest] = guest.name.trim().split(" ");
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: guest.email,
        amount: total * 100,
        currency: "NGN",
        firstname: firstName || guest.name,
        lastname: rest.join(" ") || "",
        phone: guest.phone,
        ref: `remeritona-${Date.now()}`,
        metadata: {
          custom_fields: [
            { display_name: "Room", variable_name: "room", value: room.name },
            { display_name: "Check-in", variable_name: "checkin", value: checkIn },
            { display_name: "Check-out", variable_name: "checkout", value: checkOut },
            { display_name: "Nights", variable_name: "nights", value: String(nights) },
          ],
        },
        callback: function(response: { reference: string }) {
          if (response.reference) {
            sendBookingEmails(response.reference);   // Removed 'await' here
            setConfirmed(true);
          }
        },
        onClose: () => {
          setPaymentError("Payment was cancelled. Please try again.");
        },
      });
      handler.openIframe();
    } catch (e) {
      console.error("Paystack error:", e);
      setPaymentError("Could not open Paystack. Please refresh the page and try again.");
    }
  };

  const handleFlutterwave = () => {
    setPaymentError(null);

    if (!window.FlutterwaveCheckout) {
  setPaymentError("Loading payment... please wait.");
  setTimeout(() => {
    if (window.FlutterwaveCheckout) {
      setPaymentError(null);
      handleFlutterwave();
    } else {
      setPaymentError("Payment could not load. Please refresh the page and try again.");
    }
  }, 2000);
  return;
}

    if (!guest.email) {
      setPaymentError("Please go back and enter your email address.");
      return;
    }

    setProcessing(true);

    const modal = window.FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: `remeritona-${Date.now()}`,
      amount: total,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: guest.email,
        phone_number: guest.phone,
        name: guest.name,
      },
      customizations: {
        title: "Re Meritona Hotel & Suites",
        description: `${room.name} · ${nights} night${nights > 1 ? "s" : ""}`,
        logo: "/src/assets/logo.png",
      },
      callback: async (response: { status: string }) => {
        setProcessing(false);
        if (response.status === "successful" || response.status === "completed") {
          const reference = `remeritona-${Date.now()}`;
          await sendBookingEmails(reference);
          
          setTimeout(() => {
            if (modal && typeof modal.close === "function") {
              modal.close();
            }
            setConfirmed(true);
          }, 3000);
        } else {
          setPaymentError("Payment was not successful. Please try again.");
        }
      },
      onclose: () => {
        setProcessing(false);
      },
    });
  };

  const handleConfirm = () => {
    if (paymentMethod === "paystack") handlePaystack();
    else handleFlutterwave();
  };

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
              <Row label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} />
              {selectedAddons.length > 0 && (
                <Row label="Add-ons" value={selectedAddons.map(id => ADD_ONS.find(a => a.id === id)?.label).join(", ")} />
              )}
              <Row label="Total Paid" value={formatNaira(total)} highlight />
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setConfirmed(false);
                  setStep(1);
                  setSelectedAddons([]);
                  setGuest({ name: "", email: "", phone: "", notes: "" });
                  setPaymentError(null);
                  setCouponCode("");
                  setCouponResult(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft"
              >
                Book Another Stay
              </button>
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
          <div ref={stepRef} className="lg:col-span-2 space-y-8 scroll-mt-28">
            {step === 1 && (
              <Card title="1. Dates & Guests">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input label="Check In" type="date" value={checkIn} min={today} onChange={(v) => setCheckIn(v)} />
                  <Input label="Check Out" type="date" value={checkOut} min={checkIn} onChange={(v) => setCheckOut(v)} />
                </div>

                <h3 className="font-serif text-2xl mt-8 mb-4">Booking for</h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {([
                    { id: "self", label: "Booking for myself", icon: User },
                    { id: "family", label: "Family & friends", icon: Users },
                    { id: "corporate", label: "Corporate team", icon: Briefcase },
                  ] as const).map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setBookingType(id)}
                      className={`flex flex-col items-center gap-2 p-4 border transition-colors text-sm ${
                        bookingType === id ? "border-gold bg-onyx text-gold" : "border-border hover:border-gold/40"
                      }`}
                    >
                      <Icon size={22} />
                      {label}
                    </button>
                  ))}
                </div>

                {bookingType !== "self" && (
                  <div className="mt-6 flex flex-col gap-1.5 max-w-xs">
                    <label className="text-xs uppercase tracking-widest text-gold">Number of rooms</label>
                    <select
                      value={numRooms}
                      onChange={(e) => setNumRooms(Number(e.target.value))}
                      className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n} className="bg-charcoal">
                          {n} {n === 1 ? "Room" : "Rooms"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bookingType !== "self" && (
                  <div className="mt-6">
                    <h3 className="font-serif text-2xl mb-4">Guests</h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-widest text-gold">Adults</label>
                        <select
                          value={Math.min(adults, maxAdults)}
                          onChange={(e) => setAdults(Number(e.target.value))}
                          className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
                        >
                          {Array.from({ length: maxAdults }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n} className="bg-charcoal">
                              {n} {n === 1 ? "Adult" : "Adults"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-widest text-gold">Children</label>
                        <select
                          value={Math.min(children, maxChildren)}
                          onChange={(e) => setChildren(Number(e.target.value))}
                          className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
                        >
                          {Array.from({ length: maxChildren + 1 }, (_, i) => i).map((n) => (
                            <option key={n} value={n} className="bg-charcoal">
                              {n} {n === 1 ? "Child" : "Children"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Maximum: {maxAdults} Adults + {maxChildren} {maxChildren === 1 ? "Child" : "Children"} ({numRooms} {numRooms === 1 ? "room" : "rooms"}).
                    </p>
                  </div>
                )}

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
                          <p className="text-xs text-muted-foreground">{r.size} · {r.beds} · {r.occupancy}</p>
                        </div>
                        <p className="text-gold font-serif text-xl">
                          {formatNaira(r.price)}<span className="text-xs text-muted-foreground">/night</span>
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex justify-end mt-8">
                  <button
                    onClick={() => { setStep(2); scrollToStep(); }}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft"
                  >
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
                  <textarea
                    value={guest.notes}
                    onChange={(e) => setGuest({ ...guest, notes: e.target.value })}
                    rows={3}
                    maxLength={500}
                    className="w-full bg-onyx border border-border px-3 py-2 text-foreground focus:border-gold focus:outline-none mt-1.5"
                  />
                </div>

                {/* ==================== ADD-ONS SECTION ==================== */}
                <div
                  className="mt-10 group"
                  onMouseEnter={() => setShowAllAddons(true)}
                  onMouseLeave={() => setShowAllAddons(false)}
                >
                  <h3 className="font-serif text-xl mb-4 flex items-center gap-2">
                    <Plus className="text-gold" /> Add-ons (Pay on Arrival)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">Select any extra services you would like.</p>

                  <div className="grid gap-3">
                    {(showAllAddons ? ADD_ONS : ADD_ONS.slice(0, 3)).map((addon) => (
                      <label
                        key={addon.id}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all hover:border-gold/50 ${selectedAddons.includes(addon.id) ? 'border-gold bg-onyx' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedAddons.includes(addon.id)}
                            onChange={() => toggleAddon(addon.id)}
                            className="w-5 h-5 accent-gold"
                          />
                          <span>{addon.label}</span>
                        </div>
                        <span className="font-medium text-gold">{formatNaira(addon.price)}</span>
                      </label>
                    ))}
                  </div>

                  {ADD_ONS.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAddons((v) => !v)}
                      className="mt-3 w-full py-3 border border-gold/40 text-gold uppercase tracking-widest text-xs hover:bg-gold/10 transition-colors"
                    >
                      {showAllAddons ? "Show less" : `Show ${ADD_ONS.length - 3} more add-ons`}
                    </button>
                  )}
                </div>
                {/* ==================================================== */}

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 border border-border uppercase tracking-widest text-sm hover:border-gold"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { if (guest.name && guest.email && guest.phone) { setStep(3); scrollToStep(); } }}
                    disabled={!guest.name || !guest.email || !guest.phone}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card title="3. Payment">
                <p className="text-muted-foreground mb-6">
                  Choose your preferred secure payment method below. You'll complete payment in a popup window.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paystack")}
                    className={`p-4 border text-left transition-colors ${
                      paymentMethod === "paystack" ? "border-gold bg-onyx" : "border-border hover:border-gold/40"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-widest ${paymentMethod === "paystack" ? "text-gold" : ""}`}>
                      Paystack
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Pay with Card, Bank Transfer or USSD</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("flutterwave")}
                    className={`p-4 border text-left transition-colors ${
                      paymentMethod === "flutterwave" ? "border-gold bg-onyx" : "border-border hover:border-gold/40"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-widest ${paymentMethod === "flutterwave" ? "text-gold" : ""}`}>
                      Flutterwave
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Pay with Card or Bank Transfer</p>
                  </button>
                </div>

                {paymentError && (
                  <p className="text-gold border border-gold/40 bg-onyx px-4 py-3 text-sm mb-4">
                    {paymentError}
                  </p>
                )}

                {processing && (
                  <p className="text-muted-foreground text-sm mb-4 text-center animate-pulse">
                    Processing your payment...
                  </p>
                )}

                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 border border-border uppercase tracking-widest text-sm hover:border-gold"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <CreditCard size={16} /> {processing ? "Processing..." : "Confirm Booking"}
                  </button>
                </div>
                <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
                  <Lock size={12} className="text-gold" /> Secured & Encrypted Payment
                </p>
              </Card>
            )}
          </div>

          <aside ref={summaryRef} className="scroll-mt-28">
            <div className="bg-charcoal border border-gold/30 p-6 lg:sticky lg:top-28">
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Reservation Summary</p>
              <img src={room.image} alt={room.name} className="w-full aspect-video object-cover mb-4" />
              <h3 className="font-serif text-xl mb-4">{room.name}</h3>
              <div className="space-y-2 text-sm border-t border-border pt-4">
                <Row label="Check-in" value={new Date(checkIn).toLocaleDateString()} />
                <Row label="Check-out" value={new Date(checkOut).toLocaleDateString()} />
                <Row label="Nights" value={String(nights)} />
                <Row label="Rooms" value={String(numRooms)} />
                <Row label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} />
                <Row label="Booking type" value={bookingType === "self" ? "Myself" : bookingType === "family" ? "Family & friends" : "Corporate team"} />
              </div>
              <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
                <Row label={`${formatNaira(room.price)} × ${nights} nights × ${numRooms} ${numRooms === 1 ? "room" : "rooms"}`} value={formatNaira(subtotal)} />
                {discount > 0 && couponResult && couponResult.valid && (
                  <Row label={couponResult.label} value={`− ${formatNaira(discount)}`} />
                )}
                <Row label="Taxes & fees (7.5%)" value={formatNaira(tax)} />
                {addonsTotal > 0 && (
                  <Row label="Add-ons" value={formatNaira(addonsTotal)} />
                )}
              </div>

              {/* Coupon */}
              <div className="border-t border-border mt-4 pt-4">
                <label className="text-[10px] uppercase tracking-[0.3em] text-gold flex items-center gap-1.5 mb-2">
                  <Tag size={12} /> Promo / Coupon code
                </label>
                {couponResult && couponResult.valid ? (
                  <div className="flex items-center justify-between gap-2 bg-onyx border border-gold/40 px-3 py-2 text-sm">
                    <span className="text-gold truncate">{couponResult.message}</span>
                    <button onClick={removeCoupon} className="text-muted-foreground hover:text-gold" aria-label="Remove coupon">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="e.g. FON-WEEKEND"
                        className="flex-1 bg-onyx border border-border px-3 py-2 text-sm text-foreground focus:border-gold focus:outline-none uppercase tracking-wider"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        type="button"
                        className="px-4 py-2 bg-gold text-primary-foreground text-xs uppercase tracking-widest font-semibold hover:bg-gold-soft"
                      >
                        Apply
                      </button>
                    </div>
                    {couponResult && !couponResult.valid && (
                      <p className="text-xs text-gold/80 mt-2">{couponResult.reason}</p>
                    )}
                  </>
                )}
              </div>

              <div className="border-t border-gold/30 mt-4 pt-4">
                <Row label="Total" value={formatNaira(total)} highlight />
              </div>

              {selectedAddons.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border text-xs">
                  <p className="text-gold mb-1">Selected Add-ons:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    {selectedAddons.map(id => {
                      const addon = ADD_ONS.find(a => a.id === id);
                      return <li key={id}>• {addon?.label}</li>;
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Mobile-only continue button below summary */}
            <div className="lg:hidden mt-6">
              {step === 1 && (
                <button
                  onClick={() => { setStep(2); scrollToForm(); }}
                  className="w-full py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft"
                >
                  Continue
                </button>
              )}
              {step === 2 && (
                <button
                  onClick={() => { if (guest.name && guest.email && guest.phone) { setStep(3); scrollToForm(); } }}
                  disabled={!guest.name || !guest.email || !guest.phone}
                  className="w-full py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue to Payment
                </button>
              )}
              {step === 3 && (
                <button
                  onClick={handleConfirm}
                  disabled={processing}
                  className="w-full py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CreditCard size={16} /> {processing ? "Processing..." : "Confirm Booking"}
                </button>
              )}
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

function Input({ label, type = "text", value, onChange, min, required }: {
  label: string; type?: string; value: string; onChange: (v: string) => void; min?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs uppercase tracking-widest text-gold">{label}{required && " *"}</label>
      <input
        type={type}
        value={value}
        min={min}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
      />
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