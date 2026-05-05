import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { rooms, formatNaira } from "@/data/rooms";
import { ArrowRight, Users, Bed, Maximize } from "lucide-react";

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

      <section className="pt-40 pb-16 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Accommodations</p>
          <h1 className="font-serif text-5xl md:text-6xl mb-6">Rooms & Suites</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Each room at Remeritona is a private retreat — appointed with industrial textures, golden warmth and impeccable comfort.
          </p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          {rooms.map((room, i) => (
            <article key={room.slug} className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Link to="/rooms/$slug" params={{ slug: room.slug }} className="block overflow-hidden group">
                <img src={room.image} alt={room.name} loading="lazy" width={1280} height={832}
                  className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-700" />
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
                    <span key={a} className="text-xs uppercase tracking-wider px-3 py-1.5 border border-border text-muted-foreground">{a}</span>
                  ))}
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
                    <p className="font-serif text-3xl text-gold">{formatNaira(room.price)}<span className="text-sm text-muted-foreground"> / night</span></p>
                  </div>
                  <Link to="/booking" search={{ room: room.slug } as never}
                    className="px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft transition-colors inline-flex items-center gap-2">
                    Book Now <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
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
