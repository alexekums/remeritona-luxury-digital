import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingWidget } from "@/components/BookingWidget";
import { getRoom, formatNaira, rooms } from "@/data/rooms";
import { ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/rooms/$slug")({
  loader: ({ params }) => {
    const room = getRoom(params.slug);
    if (!room) throw notFound();
    return { room };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.room.name} — Remeritona Hotel Abakaliki` },
          { name: "description", content: loaderData.room.description },
          { property: "og:image", content: loaderData.room.image },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background grid place-items-center">
      <div className="text-center">
        <h1 className="font-serif text-4xl mb-4">Room not found</h1>
        <Link to="/rooms" className="text-gold uppercase tracking-widest">View all rooms</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <p className="text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: RoomDetail,
});

function RoomDetail() {
  const { room } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative h-[70vh] overflow-hidden">
        <img src={room.image} alt={room.name} className="absolute inset-0 w-full h-full object-cover" width={1280} height={832} />
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-6 pb-16">
          <div>
            <Link to="/rooms" className="text-gold/80 text-xs uppercase tracking-widest inline-flex items-center gap-2 hover:text-gold mb-4">
              <ArrowLeft size={14} /> All Rooms
            </Link>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{room.tagline}</p>
            <h1 className="font-serif text-5xl md:text-7xl">{room.name}</h1>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <h2 className="font-serif text-3xl mb-4">About this room</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-10">{room.description}</p>

            <h3 className="font-serif text-2xl mb-4">Amenities</h3>
            <ul className="grid sm:grid-cols-2 gap-3 mb-10">
              {room.amenities.map((a: string) => (
                <li key={a} className="flex items-center gap-3 text-muted-foreground">
                  <Check size={16} className="text-gold" /> {a}
                </li>
              ))}
            </ul>

            <h3 className="font-serif text-2xl mb-4">Room details</h3>
            <dl className="grid sm:grid-cols-3 gap-4">
              <Detail label="Size" value={room.size} />
              <Detail label="Bedding" value={room.beds} />
              <Detail label="Capacity" value={`${room.capacity} Guests`} />
            </dl>
          </div>

          <aside className="lg:sticky lg:top-28 self-start">
            <div className="bg-charcoal border border-gold/30 p-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
              <p className="font-serif text-4xl text-gold mb-1">{formatNaira(room.price)}</p>
              <p className="text-sm text-muted-foreground mb-6">per night, taxes included</p>
              <BookingWidget variant="inline" />
            </div>
          </aside>
        </div>
      </section>

      <section className="py-20 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl mb-8">Other Rooms</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {rooms.filter((r) => r.slug !== room.slug).map((r) => (
              <Link key={r.slug} to="/rooms/$slug" params={{ slug: r.slug }} className="group bg-onyx border border-border hover:border-gold/50">
                <img src={r.image} alt={r.name} loading="lazy" className="aspect-[4/3] object-cover w-full group-hover:scale-105 transition-transform duration-700" />
                <div className="p-5">
                  <h3 className="font-serif text-xl group-hover:text-gold transition-colors">{r.name}</h3>
                  <p className="text-gold text-sm mt-2">{formatNaira(r.price)} / night</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border p-4">
      <dt className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</dt>
      <dd className="font-serif text-lg">{value}</dd>
    </div>
  );
}
