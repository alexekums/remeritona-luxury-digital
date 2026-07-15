import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Check, Calendar } from "lucide-react";
import { toast } from "sonner";
import { formatNaira } from "@/data/rooms";
import { z } from "zod";

const HALL_PRICES = {
  pool_hall: 300000,
  board_room: 500000,
  conference_hall: 700000,
  penthouse: 800000,
  banquet_hall: 2000000,
};

const HALL_LABELS = {
  pool_hall: "Pool Hall (Outdoor Receptions & Parties)",
  board_room: "Board Room (Executive Dark Boardroom Table)",
  conference_hall: "Conference Hall (Round Banquet Table Layout)",
  penthouse: "Penthouse (Red Theater Auditorium Seating)",
  banquet_hall: "Banquet Hall (Grand Celebrations)",
};

const HALL_DETAILS = {
  pool_hall: {
    name: "Pool Hall",
    img: "/Remeritona Hotel Gallery/Pool/IMG_6956.webp",
    desc: "Outdoor Receptions & Parties. Ideal for breezy evening cocktail events and poolside celebrations.",
  },
  board_room: {
    name: "Board Room",
    img: "/Remeritona Hotel Gallery/Conference room/IMG_6890.webp",
    desc: "Executive Dark Boardroom Table. Crafted for high-stakes corporate meetings and workshops.",
  },
  conference_hall: {
    name: "Conference Hall",
    img: "/Remeritona Hotel Gallery/Conference hall/IMG_7044.webp",
    desc: "Round Banquet Table Layout. Optimized for seminars, banquets, and presentations.",
  },
  penthouse: {
    name: "Penthouse",
    img: "/Remeritona Hotel Gallery/Conference hall/IMG_7046.webp",
    desc: "Red Theater Auditorium Seating. Features built-in screen projectors and luxury seating.",
  },
  banquet_hall: {
    name: "Banquet Hall",
    img: "/Remeritona Hotel Gallery/Event Hall/IMG-20260713-WA0015.webp",
    desc: "Grand Celebrations. Ebonyi state's landmark spacious venue for weddings and grand banquets.",
  },
};

const searchSchema = z.object({
  type: z.enum(["pool_hall", "board_room", "conference_hall", "penthouse", "banquet_hall"]).optional(),
});

export const Route = createFileRoute("/venue-booking")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Venue & Hall Booking — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Book our premium event halls and conference rooms." },
    ],
  }),
  component: VenueBookingPage,
});

function VenueBookingPage() {
  const sp = Route.useSearch();
  const [hallType, setHallType] = useState<keyof typeof HALL_PRICES>(
    sp.type && sp.type in HALL_PRICES ? sp.type : "pool_hall"
  );

  useEffect(() => {
    if (sp.type && sp.type in HALL_PRICES) {
      setHallType(sp.type);
    }
  }, [sp.type]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [bookedDates, setBookedDates] = useState<{ hall_type: string, booking_date: string }[]>([]);
  
  const [guest, setGuest] = useState({ name: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetch("/api/hall-bookings")
      .then((res) => res.json())
      .then((data: any) => {
        if (data.success) {
          setBookedDates(data.bookings);
        }
      })
      .catch((err) => console.error("Failed to load hall bookings", err));
  }, []);

  const getMinDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const isDateBooked = (dateStr: string) => {
    return bookedDates.some((b) => b.hall_type === hallType && b.booking_date === dateStr);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value;
    if (isDateBooked(date)) {
      toast.error("This date is already booked for the selected hall.");
      setSelectedDate("");
    } else {
      setSelectedDate(date);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("Please select a valid booking date.");
      return;
    }
    if (isDateBooked(selectedDate)) {
      toast.error("This date is already booked.");
      return;
    }

    setIsSubmitting(true);
    try {
      const amount = HALL_PRICES[hallType];
      const reference = `HV-${Date.now()}`;
      
      const res = await fetch("/api/hall-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hall_type: hallType,
          guest_name: guest.name,
          guest_email: guest.email,
          guest_phone: guest.phone,
          booking_date: selectedDate,
          amount,
          reference
        }),
      });
      const data = (await res.json()) as any;
      
      if (data.success) {
        setConfirmed(true);
        // Refresh booked dates so we don't double book locally
        setBookedDates(prev => [...prev, { hall_type: hallType, booking_date: selectedDate }]);
      } else {
        toast.error(data.error || "Failed to book venue.");
      }
    } catch (err) {
      toast.error("An error occurred during booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <section className="pt-32 pb-24 px-6 flex-grow flex items-center justify-center">
          <div className="max-w-xl w-full mx-auto bg-zinc-900 border border-gold/30 p-8 md:p-12 shadow-2xl relative" id="printable-voucher">
            <div className="absolute top-0 left-0 w-full h-2 bg-gold"></div>
            <div className="w-16 h-16 rounded-full bg-gold/10 text-gold grid place-items-center mx-auto mb-6">
              <Check size={32} />
            </div>
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl mb-2 text-foreground">Venue Voucher</h1>
              <p className="text-gold tracking-[0.2em] text-xs uppercase">Remeritona Hotel & Suites</p>
            </div>
            
            <div className="space-y-4 text-sm mb-8 border-y border-border py-6">
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">Guest</span>
                <span className="font-semibold text-foreground">{guest.name}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">Venue</span>
                <span className="font-semibold text-foreground">{HALL_LABELS[hallType]}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">Date</span>
                <span className="font-semibold text-foreground">{selectedDate}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-2">
                <span className="text-muted-foreground uppercase tracking-widest text-xs">Email</span>
                <span className="font-semibold text-foreground">{guest.email}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-gold uppercase tracking-widest text-xs">Amount Due</span>
                <span className="font-serif text-xl text-gold">{formatNaira(HALL_PRICES[hallType])}</span>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground mb-8">
              A confirmation email has been sent. Please present this voucher at the front desk or contact reservations to finalize your payment.
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center print:hidden">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 border border-gold text-gold hover:bg-gold/5 uppercase tracking-widest text-xs font-semibold"
              >
                Print Voucher
              </button>
              <button
                onClick={() => {
                  setConfirmed(false);
                  setSelectedDate("");
                  setGuest({ name: "", email: "", phone: "" });
                }}
                className="px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-xs hover:bg-gold-soft"
              >
                Book Another
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
      <section className="pt-40 pb-16 px-6 bg-zinc-900">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Events & Meetings</p>
          <h1 className="font-serif text-5xl md:text-6xl mb-6">Venue Booking</h1>
          <p className="text-muted-foreground text-lg">
            Reserve our elegant Conference Room or Grand Event Hall for your next gathering.
          </p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto bg-zinc-900 border border-border p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-sm uppercase tracking-widest text-muted-foreground mb-3">Venue Type</label>
              <div className="grid sm:grid-cols-2 gap-4">
                {(Object.keys(HALL_PRICES) as Array<keyof typeof HALL_PRICES>).map((key) => {
                  const detail = HALL_DETAILS[key];
                  const active = hallType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setHallType(key);
                        setSelectedDate("");
                      }}
                      className={`p-0 border text-left transition-colors overflow-hidden flex flex-col h-full ${active ? "border-gold bg-gold/10" : "border-border hover:border-gold/30"}`}
                    >
                      <img src={detail.img} alt={detail.name} className="w-full h-32 object-cover" />
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="font-serif text-xl mb-1">{detail.name}</div>
                          <div className="text-gold mb-2">{formatNaira(HALL_PRICES[key])} / 24hrs</div>
                          <div className="text-xs text-muted-foreground">{detail.desc}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm uppercase tracking-widest text-muted-foreground mb-2">Select Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="date"
                    required
                    min={getMinDate()}
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="w-full bg-zinc-800 border border-border pl-10 pr-4 py-3 text-foreground focus:border-gold outline-none transition-colors"
                  />
                </div>
                {selectedDate && isDateBooked(selectedDate) && (
                  <p className="text-red-400 text-xs mt-2">Unavailable</p>
                )}
                {selectedDate && !isDateBooked(selectedDate) && (
                  <p className="text-green-400 text-xs mt-2">Available</p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="font-serif text-xl">Your Details</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={guest.name}
                    onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                    className="w-full bg-zinc-800 border border-border px-4 py-3 focus:border-gold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={guest.email}
                    onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                    className="w-full bg-zinc-800 border border-border px-4 py-3 focus:border-gold outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={guest.phone}
                    onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                    className="w-full bg-zinc-800 border border-border px-4 py-3 focus:border-gold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-border flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Due</p>
                <p className="font-serif text-3xl text-gold">{formatNaira(HALL_PRICES[hallType])}</p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !selectedDate || isDateBooked(selectedDate)}
                className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Processing..." : "Request Booking"}
              </button>
            </div>
          </form>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
