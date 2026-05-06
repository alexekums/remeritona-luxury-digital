import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { rooms, formatNaira } from "@/data/rooms";
import { ArrowRight, Users, Bed, Maximize, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Suites — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Discover our signature rooms and suites — Deluxe King, Executive Suite and Presidential Suite at Remeritona Hotel, Abakaliki." },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Accommodations</p>
          <h1 className="font-serif text-5xl md:text-6xl mb-6">Rooms & Suites</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Each room at Remeritona is a private retreat — appointed with warm textures, golden comfort and impeccable hospitality.
          </p>
        </div>
      </section>

      {/* Rooms List */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          {rooms.map((room, i) => (
            <article
              key={room.slug}
              className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <Link to="/rooms/$slug" params={{ slug: room.slug }} className="block overflow-hidden group">
                <img
                  src={room.image}
                  alt={room.name}
                  loading="lazy"
                  width={1280}
                  height={832}
                  className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </Link>
              <div>
                <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{room.tagline}</p>
                <h2 className="font-serif text-4xl mb-4">{room.name}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">{room.description}</p>

                <div className="grid grid-cols-3 gap-4 mb-6 py-6 border-y border-border">
                  <Spec icon={<Maximize size={18} />} label={room.size} />
                  <Spec icon={<Bed size={18} />} label={room.beds} />
                  <Spec icon={<Users size={18} />} label={`${room.capacity} Guests`} />
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {room.amenities.map((a) => (
                    <span
                      key={a}
                      className="text-xs uppercase tracking-wider px-3 py-1.5 border border-border text-muted-foreground"
                    >
                      {a}
                    </span>
                  ))}
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
                    <p className="font-serif text-3xl text-gold">
                      {formatNaira(room.price)}
                      <span className="text-sm text-muted-foreground"> / night</span>
                    </p>
                  </div>
                  <Link
                    to="/booking"
                    search={{ room: room.slug } as never}
                    className="px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft transition-colors inline-flex items-center gap-2"
                  >
                    Book Now <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Cancellation Policy */}
      <section className="py-20 px-6 bg-charcoal">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Booking Policy</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-4">Cancellation & Refunds</h2>
            <p className="text-muted-foreground text-lg">
              We understand plans can change. Here is our fair cancellation policy.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Full Refund */}
            <div className="border border-gold/30 p-8 hover:border-gold/60 transition-colors">
              <div className="w-12 h-12 grid place-items-center border border-gold text-gold mb-6">
                <CheckCircle size={24} />
              </div>
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-2">Full Refund</p>
              <h3 className="font-serif text-2xl mb-3">48 Hours Before</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cancel at least 48 hours before your check-in time and receive a
                <span className="text-foreground font-semibold"> 100% full refund</span> — no questions asked.
              </p>
            </div>

            {/* 50% Refund */}
            <div className="border border-border p-8 hover:border-gold/40 transition-colors">
              <div className="w-12 h-12 grid place-items-center border border-muted-foreground text-muted-foreground mb-6">
                <AlertCircle size={24} />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.4em] mb-2">Partial Refund</p>
              <h3 className="font-serif text-2xl mb-3">24 Hours Before</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cancel between 24–48 hours before check-in and receive a
                <span className="text-foreground font-semibold"> 50% refund</span> of your total booking amount.
              </p>
            </div>

            {/* No Refund */}
            <div className="border border-border p-8 hover:border-gold/40 transition-colors">
              <div className="w-12 h-12 grid place-items-center border border-muted-foreground text-muted-foreground mb-6">
                <XCircle size={24} />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.4em] mb-2">No Refund</p>
              <h3 className="font-serif text-2xl mb-3">Same Day</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Cancellations made on the day of check-in are
                <span className="text-foreground font-semibold"> non-refundable</span>. We recommend booking with flexibility in mind.
              </p>
            </div>
          </div>

          {/* Note */}
          <div className="mt-10 border border-border p-6 text-center">
            <p className="text-muted-foreground text-sm leading-relaxed">
              To request a refund, please call us on{" "}
              <a href="tel:09122999845" className="text-gold hover:underline">09122999845</a> or{" "}
              <a href="tel:09130844222" className="text-gold hover:underline">09130844222</a>.
              Refunds are processed within <span className="text-foreground">3–5 business days</span> to your original payment method.
              Payment gateway transaction fees are non-refundable.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <span className="text-gold">{icon}</span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}