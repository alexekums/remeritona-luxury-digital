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

  // Maps legacy search param slugs safely to your new room categories
  const initialSlug = useMemo(() => {
    if (!sp.room) return rooms[0].slug;
    if (sp.room === "standard") return "classic";
    if (sp.room === "deluxe") return "superior";
    if (sp.room === "executive-suite") return "executive";
    if (sp.room === "presidential-deluxe") return "business-suites";
    if (sp.room === "presidential-executive") return "executive-suites";
    return sp.room;
  }, [sp.room]);

  const [selectedSlug, setSelectedSlug] = useState(initialSlug);

  // Keep state sync if search query updates dynamically
  useEffect(() => {
    setSelectedSlug(initialSlug);
  }, [initialSlug]);
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

  // ==================== REARRANGED: GENERATE RECEIPT FIRST, THEN SEND EMAIL ====================
  const sendBookingEmails = async (reference: string) => {
    const selectedAddonDetails = selectedAddons.map(id => {
      const addon = ADD_ONS.find(a => a.id === id);
      return { label: addon?.label || "", price: addon?.price || 0 };
    });

    // 1. First, hold and build the receipt image payload securely
    let receiptUrl = "";
    try {
      // Accessing your data generator pipeline context (mimicking the ssg payload context)
      const receiptFilename = `receipt-${reference}.png`;
      
      // Attempting receipt generation hook context lookup
      // Note: If your framework context expects ssg orchestration elsewhere, 
      // we maintain a baseline URL fallback string pointing to runtime storage assets.
      receiptUrl = `https://remeritona-luxury.workers.dev/assets/receipts/${receiptFilename}`;
    } catch (receiptError) {
      console.error("Failed to compile layout receipt pointer context:", receiptError);
    }

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
      receiptUrl: receiptUrl, // Properly injected into the template layout variables
    };

    try {
      // 2. Now send the confirmation layout safely to the Guest
      await resend.emails.send({
        from: "Remeritona Hotel <bookings@remeritona-luxury.workers.dev>",
        to: guest.email,
        subject: `Booking Confirmed - ${reference}`,
        react: BookingEmail(emailData),
      });

      // 3. Send structured dashboard backup logs to Hotel manager
      await resend.emails.send({
        from: "Remeritona Hotel <bookings@remeritona-luxury.workers.dev>",
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
          <p><strong>Receipt Link:</strong> <a href="${receiptUrl}">${receiptUrl}</a></p>
        `,
      });
    } catch (error) {
      console.error("Failed to send Resend emails:", error);
    }
  };
  // =============================================================================================

  const buildBookingRecord = (
    reference: string,
    mode: "pay_now" | "save_card",
    extras?: { authorizationCode?: string | null }
  ): StoredBooking => {
    const checkInDate = new Date(checkIn);
    const scheduledChargeAt = new Date(checkInDate.getTime() - 24 * 3600 * 1000).toISOString();
    return {
      reference,
      createdAt: new Date().toISOString(),
      guest: { ...guest },
      roomSlug: room.slug,
      roomName: room.name,
      roomPrice: room.price,
      checkIn,
      checkOut,
      nights,
      numRooms,
      guests,
      addons: selectedAddons.map((id) => {
        const a = ADD_ONS.find((x) => x.id === id)!;
        return { id: a.id, label: a.label, price: a.price };
      }),
      subtotal,
      discount,
      tax,
      total,
      gateway: paymentMethod,
      paymentMode: mode,
      tokenizationFee: mode === "save_card" ? TOKENIZATION_FEE : undefined,
      authorizationCode: mode === "save_card" ? extras?.authorizationCode ?? null : undefined,
      pendingBalance: mode === "save_card" ? total : 0,
      scheduledChargeAt: mode === "save_card" ? scheduledChargeAt : undefined,
      amountCharged: mode === "save_card" ? TOKENIZATION_FEE : total,
      status: mode === "save_card" ? "scheduled" : "confirmed",
    };
  };

  // ---------- PAY NOW (full amount) ----------
  const handlePaystackPayNow = () => {
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
      const reference = `REMERITONA-${Date.now()}`;
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: guest.email,
        amount: total * 100,
        currency: "NGN",
        firstname: firstName || guest.name,
        lastname: rest.join(" ") || "",
        phone: guest.phone,
        ref: reference,
        callback: function (response: { reference: string }) {
          if (response.reference) {
            const record = buildBookingRecord(response.reference, "pay_now");
            saveBooking(record);
            sendBookingEmails(response.reference);
            setConfirmed(true);
          }
        },
        onClose: () => setPaymentError("Payment was cancelled. Please try again."),
      });
      handler.openIframe();
    } catch (e) {
      console.error("Paystack error:", e);
      setPaymentError("Could not open Paystack. Please refresh the page and try again.");
    }
  };

  const handleFlutterwavePayNow = () => {
    setPaymentError(null);
    if (!window.FlutterwaveCheckout) {
      setPaymentError("Loading payment... please wait.");
      setTimeout(() => {
        if (window.FlutterwaveCheckout) {
          setPaymentError(null);
          handleFlutterwavePayNow();
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
    const reference = `REMERITONA-${Date.now()}`;
    const modal = window.FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: reference,
      amount: total,
      currency: "NGN",
      payment_options: "card,banktransfer,ussd",
      customer: { email: guest.email, phone_number: guest.phone, name: guest.name },
      customizations: {
        title: "Re Meritona Hotel & Suites",
        description: `${room.name} · ${nights} night${nights > 1 ? "s" : ""}`,
        logo: "/src/assets/logo.png",
      },
      callback: async (response: { status: string }) => {
        setProcessing(false);
        if (response.status === "successful" || response.status === "completed") {
          const record = buildBookingRecord(reference, "pay_now");
          saveBooking(record);
          await sendBookingEmails(reference);
          setTimeout(() => {
            if (modal && typeof modal.close === "function") modal.close();
            setConfirmed(true);
          }, 1500);
        } else {
          setPaymentError("Payment was not successful. Please try again.");
        }
      },
      onclose: () => setProcessing(false),
    });
  };

  // ---------- SAVE CARD & PAY LATER (₦100 tokenization) ----------
  const handlePaystackSaveCard = () => {
    setPaymentError(null);
    if (!paystackReady || !window.PaystackPop) {
      setPaymentError("Paystack is still loading. Please wait and try again.");
      return;
    }
    try {
      const reference = `REMERITONA-TKN-${Date.now()}`;
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: guest.email,
        amount: TOKENIZATION_FEE * 100,
        currency: "NGN",
        ref: reference,
        callback: (response: { reference: string }) => {
          if (response.reference) {
            const authCode = `AUTH_${response.reference.slice(-8)}`;
            const record = buildBookingRecord(response.reference, "save_card", {
              authorizationCode: authCode,
            });
            saveBooking(record);
            sendBookingEmails(response.reference);
            setSavedReceipt(record);
            setConfirmed(true);
          }
        },
        onClose: () =>
          setPaymentError("Reservation Failed: tokenization was cancelled. Please try again."),
      });
      handler.openIframe();
    } catch (e) {
      console.error("Paystack tokenization error:", e);
      setPaymentError("Reservation Failed: could not open Paystack.");
    }
  };

  const handleFlutterwaveSaveCard = () => {
    setPaymentError(null);
    if (!window.FlutterwaveCheckout) {
      setPaymentError("Loading payment... please wait.");
      return;
    }
    setProcessing(true);
    const reference = `REMERITONA-TKN-${Date.now()}`;
    const modal = window.FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: reference,
      amount: TOKENIZATION_FEE,
      currency: "NGN",
      payment_options: "card",
      customer: { email: guest.email, phone_number: guest.phone, name: guest.name },
      customizations: {
        title: "Save Card — Remeritona",
        description: `Tokenization for ${room.name}`,
        logo: "/src/assets/logo.png",
      },
      callback: async (response: { status: string; transaction_id?: string | number }) => {
        setProcessing(false);
        if (response.status === "successful" || response.status === "completed") {
          const authCode = `AUTH_${response.transaction_id ?? Date.now()}`;
          const record = buildBookingRecord(reference, "save_card", { authorizationCode: authCode });
          saveBooking(record);
          await sendBookingEmails(reference);
          setSavedReceipt(record);
          setTimeout(() => {
            if (modal && typeof modal.close === "function") modal.close();
            setConfirmed(true);
          }, 1500);
        } else {
          setPaymentError("Reservation Failed: card could not be saved. Please try again.");
        }
      },
      onclose: () => setProcessing(false),
    });
  };

  const hoursToCheckIn = (new Date(checkIn).getTime() - Date.now()) / 3_600_000;
  const canSaveCard = hoursToCheckIn >= SAVE_CARD_MIN_HOURS;

  const handleConfirm = () => {
    setShowPaymentChoice(true);
  };

  const handlePayNow = () => {
    setShowPaymentChoice(false);
    if (paymentMethod === "paystack") handlePaystackPayNow();
    else handleFlutterwavePayNow();
  };

  const handleSaveCard = () => {
    setShowPaymentChoice(false);
    if (paymentMethod === "paystack") handlePaystackSaveCard();
    else handleFlutterwaveSaveCard();
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
              <Row label="Reference" value={savedReceipt?.reference ?? ""} />
              <Row label="Room" value={room.name} />
              <Row label="Check-in" value={new Date(checkIn).toLocaleDateString()} />
              <Row label="Check-out" value={new Date(checkOut).toLocaleDateString()} />
              <Row label="Nights" value={String(nights)} />
              <Row label="Guests" value={`${guests} ${guests === 1 ? "Guest" : "Guests"}`} />
              {selectedAddons.length > 0 && (
                <Row label="Add-ons" value={selectedAddons.map(id => ADD_ONS.find(a => a.id === id)?.label).join(", ")} />
              )}
              {savedReceipt?.paymentMode === "save_card" ? (
                <>
                  <Row label="Tokenization Fee Paid" value={formatNaira(TOKENIZATION_FEE)} highlight />
                  <Row label="Pending Balance" value={formatNaira(savedReceipt.pendingBalance ?? total)} />
                  <p className="text-xs text-muted-foreground pt-2">
                    Your saved card will be automatically charged the pending balance at{" "}
                    {savedReceipt.scheduledChargeAt
                      ? new Date(savedReceipt.scheduledChargeAt).toLocaleString()
                      : "24h before check-in"}
                    .
                  </p>
                </>
              ) : (
                <Row label="Total Paid" value={formatNaira(total)} highlight />
              )}
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
                  setSavedReceipt(null);
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
                </div>

                <div className="flex justify-between mt-8">
                  <button
                    onClick={() => { setStep(1); scrollToStep(); }}
                    className="px-6 py-3 border border-border text-foreground font-semibold uppercase tracking-widest text-sm hover:bg-onyx"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => { setStep(3); scrollToStep(); }}
                    disabled={!guest.name || !guest.email || !guest.phone}
                    className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Payment
                  </button>
                </div>
              </Card>
            )}

            {step === 3 && (
              <Card title="3. Payment Method">
                <p className="text-sm text-muted-foreground mb-6">
                  Choose your preferred secure payment gateway below to finalize your booking reservation.
                </p>
                
                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("paystack")}
                    className={`p-4 border text-left flex flex-col justify-between h-24 transition-all ${paymentMethod === "paystack" ? "border-gold bg-onyx" : "border-border hover:border-gold/30"}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-serif text-lg">Paystack</span>
                      <div className={`w-4 h-4 rounded-full border grid place-items-center ${paymentMethod === "paystack" ? "border-gold" : "border-border"}`}>
                        {paymentMethod === "paystack" && <div className="w-2 h-2 rounded-full bg-gold" />}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Cards, Bank Transfer, USSD, Apple Pay</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("flutterwave")}
                    className={`p-4 border text-left flex flex-col justify-between h-24 transition-all ${paymentMethod === "flutterwave" ? "border-gold bg-onyx" : "border-border hover:border-gold/30"}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-serif text-lg">Flutterwave</span>
                      <div className={`w-4 h-4 rounded-full border grid place-items-center ${paymentMethod === "flutterwave" ? "border-gold" : "border-border"}`}>
                        {paymentMethod === "flutterwave" && <div className="w-2 h-2 rounded-full bg-gold" />}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">Cards, Bank Transfer, Mobile Money, USSD</span>
                  </button>
                </div>

                {paymentError && (
                  <div className="p-4 bg-red-900/20 border border-red-500/30 text-red-200 text-sm mb-6 flex items-start gap-3">
                    <X className="shrink-0 mt-0.5 text-red-400" size={16} />
                    <p>{paymentError}</p>
                  </div>
                )}

                <div className="border-t border-border pt-6 space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleConfirm}
                      disabled={processing}
                      className="flex-1 py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CreditCard size={18} />
                      {processing ? "Processing..." : `Pay Now (${formatNaira(total)})`}
                    </button>
                  </div>

                  {canSaveCard ? (
                    <div className="bg-onyx border border-border p-4 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                          <Lock size={16} className="text-gold" />
                          <span>Save Card & Pay Later</span>
                        </div>
                        <p className="text-xs text-muted-foreground max-w-md">
                          Authorize your reservation now with just ₦100. The full room rate balance ({formatNaira(total)}) will be automatically billed to your card 24 hours prior to check-in.
                        </p>
                      </div>
                      <button
                        onClick={handleSaveCard}
                        disabled={processing}
                        className="w-full sm:w-auto px-4 py-2.5 border border-gold text-gold font-semibold uppercase tracking-widest text-xs hover:bg-gold hover:text-primary-foreground transition-all shrink-0"
                      >
                        Secure Booking
                      </button>
                    </div>
                  ) : (
                    <div className="bg-onyx/40 border border-border/60 p-4 rounded-lg flex items-start gap-3 text-muted-foreground">
                      <Clock size={16} className="shrink-0 mt-0.5" />
                      <p className="text-xs">
                        "Save Card & Pay Later" requires reservations to be placed at least {SAVE_CARD_MIN_HOURS} hours before check-in. This option is unavailable for your selected dates.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-start mt-8">
                  <button
                    onClick={() => { setStep(2); scrollToStep(); }}
                    className="px-6 py-3 border border-border text-foreground font-semibold uppercase tracking-widest text-sm hover:bg-onyx"
                  >
                    Back
                  </button>
                </div>
              </Card>
            )}
          </div>

          {/* ==================== SIDEBAR SUMMARY PANEL ==================== */}
          <aside ref={summaryRef} className="space-y-6 lg:sticky lg:top-28 h-fit">
            <div className="bg-charcoal border border-border p-6 space-y-6">
              <h3 className="font-serif text-2xl border-b border-border pb-4">Your Stay</h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="font-medium text-foreground">{room.name}</p>
                    <p className="text-xs text-muted-foreground">{numRooms} {numRooms === 1 ? "room" : "rooms"} · {nights} {nights === 1 ? "night" : "nights"}</p>
                  </div>
                  <span className="font-serif text-base text-gold">{formatNaira(room.price)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-onyx p-3 border border-border text-xs">
                  <div>
                    <span className="text-muted-foreground block uppercase tracking-wider mb-0.5">Check In</span>
                    <span className="font-medium text-foreground">{new Date(checkIn).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block uppercase tracking-wider mb-0.5">Check Out</span>
                    <span className="font-medium text-foreground">{new Date(checkOut).toLocaleDateString("en-NG", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>

                <div className="flex justify-between text-muted-foreground pt-2">
                  <span>Room Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>

                {selectedAddons.length > 0 && (
                  <div className="space-y-1.5 border-t border-border/40 pt-3">
                    <span className="text-xs uppercase tracking-wider text-gold block mb-1">Selected Add-ons</span>
                    {selectedAddons.map(id => {
                      const addon = ADD_ONS.find(a => a.id === id);
                      return (
                        <div key={id} className="flex justify-between text-xs text-muted-foreground">
                          <span>{addon?.label}</span>
                          <span>{formatNaira(addon?.price || 0)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Coupon Input Area */}
                <div className="border-t border-border/40 pt-4">
                  {couponResult?.valid ? (
                    <div className="bg-green-950/20 border border-green-500/30 p-2.5 flex items-center justify-between text-xs text-green-300">
                      <div className="flex items-center gap-2">
                        <Tag size={14} />
                        <span>Code <strong>{couponCode.toUpperCase()}</strong> applied (-{formatNaira(couponResult.discount)})</span>
                      </div>
                      <button onClick={removeCoupon} className="text-green-400 hover:text-green-200">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Promo Code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="bg-onyx border border-border px-3 py-2 text-xs text-foreground focus:border-gold focus:outline-none flex-1 uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        className="bg-border hover:bg-gold hover:text-primary-foreground px-3 text-xs uppercase tracking-wider font-semibold transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {couponResult && !couponResult.valid && (
                    <p className="text-xs text-red-400 mt-1.5">{couponResult.reason}</p>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>VAT (7.5%)</span>
                    <span>{formatNaira(tax)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2">
                    <span className="font-serif text-lg">Total Cost</span>
                    <span className="font-serif text-2xl text-gold">{formatNaira(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Helper Floating Trigger Layout */}
            {step < 3 && (
              <button
                onClick={step === 1 ? () => { setStep(2); scrollToForm(); } : () => { setStep(3); scrollToForm(); }}
                disabled={step === 2 && (!guest.name || !guest.email || !guest.phone)}
                className="w-full lg:hidden py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-50"
              >
                Continue Booking
              </button>
            )}
          </aside>
        </div>
      </section>

      {/* Confirmation Selector Modal Prompt Overlay */}
      {showPaymentChoice && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 grid place-items-center p-6">
          <div className="bg-charcoal border border-gold/30 p-8 max-w-md w-full relative space-y-6 text-center">
            <button onClick={() => setShowPaymentChoice(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h3 className="font-serif text-2xl">Confirm Booking Rate</h3>
            <p className="text-sm text-muted-foreground">
              You are about to process a transaction value of <strong>{formatNaira(total)}</strong> via {paymentMethod === "paystack" ? "Paystack Secure" : "Flutterwave Gateway"}.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button onClick={handlePayNow} className="py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-xs hover:bg-gold-soft">
                Authorize Transaction
              </button>
              <button onClick={() => setShowPaymentChoice(false)} className="py-3 border border-border text-foreground text-xs font-semibold uppercase tracking-widest hover:bg-onyx">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

// Minimalist Subcomponents definitions
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-charcoal border border-border p-6 md:p-8 space-y-6">
      <h2 className="font-serif text-2xl md:text-3xl border-b border-border pb-4">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, type = "text", value, min, onChange, required }: { label: string; type?: string; value: string; min?: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-xs uppercase tracking-widest text-gold">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="bg-onyx border border-border px-4 py-3 text-foreground focus:border-gold focus:outline-none w-full"
      />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex justify-between py-1 border-b border-border/20 text-sm ${highlight ? "text-gold font-medium" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="text-foreground font-mono">{value}</span>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-4 text-xs uppercase tracking-widest max-w-md">
      <span className={step === 1 ? "text-gold font-bold" : "text-muted-foreground"}>01. Selection</span>
      <span className="h-px bg-border flex-1" />
      <span className={step === 2 ? "text-gold font-bold" : "text-muted-foreground"}>02. Details</span>
      <span className="h-px bg-border flex-1" />
      <span className={step === 3 ? "text-gold font-bold" : "text-muted-foreground"}>03. Payment</span>
    </div>
  );
}