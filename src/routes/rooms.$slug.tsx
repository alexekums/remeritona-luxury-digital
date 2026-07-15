import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getRoom, formatNaira, rooms } from "@/data/rooms";
import { 
  ArrowLeft, Check, ChevronLeft, ChevronRight, Calendar, Maximize, Bed, Users, 
  Wifi, Snowflake, Tv, Wine, Bath, Sparkles, Briefcase, Sofa, UserCheck, Eye, HelpCircle 
} from "lucide-react";

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
        <h1 className="font-serif text-4xl mb-4 text-foreground">Room not found</h1>
        <Link to="/rooms" className="text-gold uppercase tracking-widest hover:text-gold-soft transition-colors">View all rooms</Link>
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

function getAmenityIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("wi-fi") || n.includes("wifi")) return <Wifi size={20} />;
  if (n.includes("air conditioning") || n.includes("ac")) return <Snowflake size={20} />;
  if (n.includes("tv") || n.includes("television")) return <Tv size={20} />;
  if (n.includes("bar")) return <Wine size={20} />;
  if (n.includes("bath") || n.includes("shower")) return <Bath size={20} />;
  if (n.includes("housekeeping") || n.includes("cleaning")) return <Sparkles size={20} />;
  if (n.includes("workspace") || n.includes("desk")) return <Briefcase size={20} />;
  if (n.includes("lounge") || n.includes("living")) return <Sofa size={20} />;
  if (n.includes("concierge")) return <UserCheck size={20} />;
  if (n.includes("view")) return <Eye size={20} />;
  return <HelpCircle size={20} />;
}

function HeroSlider({ images, name }: { images: string[]; name: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="absolute inset-0 w-full h-full">
      <div 
        className="flex w-full h-full transition-transform duration-[1000ms] ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`${name} view ${idx + 1}`}
            className="w-full h-full object-cover shrink-0"
            width={1280}
            height={832}
          />
        ))}
      </div>
      
      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-gold hover:text-primary-foreground flex items-center justify-center transition-all z-20"
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white hover:bg-gold hover:text-primary-foreground flex items-center justify-center transition-all z-20"
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "bg-gold w-6" : "bg-white/50 hover:bg-white"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ room }: { room: any }) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const maxGuests = room.capacity || 3;

  const nights = useMemo(() => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) return 1;
    const diff = checkOutDate.getTime() - checkInDate.getTime();
    const calculated = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return calculated > 0 ? calculated : 1;
  }, [checkIn, checkOut]);

  const totalPrice = room.price * nights;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      to: "/booking",
      search: {
        room: room.slug,
        checkIn,
        checkOut,
        guests: adults + children,
        adults,
        children,
      } as never,
    });
  };

  return (
    <div className="bg-charcoal border border-gold/30 p-8 shadow-elegant text-foreground">
      <div className="mb-6 pb-6 border-b border-border/60">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Price per night</p>
        <div className="flex items-baseline gap-1">
          <span className="font-serif text-4xl text-gold font-bold">{formatNaira(room.price)}</span>
          <span className="text-sm text-muted-foreground">/ night</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Room type indicator (Locked) */}
        <div>
          <label className="block text-xs uppercase tracking-widest text-gold mb-2 font-semibold">Room Selection</label>
          <div className="bg-onyx/60 border border-border/80 px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{room.name}</span>
            <span className="text-[10px] uppercase bg-gold/10 text-gold px-2 py-0.5 border border-gold/30 font-semibold">Locked</span>
          </div>
        </div>

        {/* Date inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gold font-semibold">Check In</label>
            <div className="relative border border-border bg-onyx/40 px-3 py-2.5 flex items-center gap-2">
              <Calendar size={14} className="text-gold" />
              <input
                type="date"
                required
                min={today}
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (new Date(e.target.value) >= new Date(checkOut)) {
                    const nextDay = new Date(new Date(e.target.value).getTime() + 86400000).toISOString().split("T")[0];
                    setCheckOut(nextDay);
                  }
                }}
                className="bg-transparent text-foreground text-sm w-full outline-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gold font-semibold">Check Out</label>
            <div className="relative border border-border bg-onyx/40 px-3 py-2.5 flex items-center gap-2">
              <Calendar size={14} className="text-gold" />
              <input
                type="date"
                required
                min={new Date(new Date(checkIn).getTime() + 86400000).toISOString().split("T")[0]}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="bg-transparent text-foreground text-sm w-full outline-none focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Guests input */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gold font-semibold">Adults</label>
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="bg-onyx/40 border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold cursor-pointer"
            >
              {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n} className="bg-charcoal">
                  {n} {n === 1 ? "Adult" : "Adults"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-widest text-gold font-semibold">Children</label>
            <select
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="bg-onyx/40 border border-border px-3 py-2.5 text-foreground text-sm focus:outline-none focus:border-gold cursor-pointer"
            >
              {[0, 1, 2].map((n) => (
                <option key={n} value={n} className="bg-charcoal">
                  {n} {n === 1 ? "Child" : "Children"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Price breakdown */}
        <div className="bg-onyx/30 p-4 border border-border/40 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{formatNaira(room.price)} x {nights} {nights === 1 ? "night" : "nights"}</span>
            <span className="text-foreground font-medium">{formatNaira(totalPrice)}</span>
          </div>
          <div className="flex justify-between border-t border-border/40 pt-2 font-semibold">
            <span className="text-gold uppercase tracking-wider text-xs">Total Estimate</span>
            <span className="text-gold font-serif text-lg">{formatNaira(totalPrice)}</span>
          </div>
        </div>

        {/* Booking Button */}
        <button
          type="submit"
          className="w-full bg-gold text-primary-foreground font-semibold py-4 uppercase tracking-widest text-sm hover:bg-gold-soft transition-colors shadow-gold flex items-center justify-center gap-2"
        >
          Book Your Stay
        </button>
      </form>
    </div>
  );
}

function Detail({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-border p-4 bg-onyx/20 flex items-center gap-4">
      <div className="text-gold bg-gold/10 p-2.5 rounded-full">{icon}</div>
      <div>
        <dt className="text-xs uppercase tracking-widest text-muted-foreground mb-0.5">{label}</dt>
        <dd className="font-serif text-lg text-foreground font-semibold">{value}</dd>
      </div>
    </div>
  );
}

function RoomDetail() {
  const { room } = Route.useLoaderData();
  const images = room.gallery && room.gallery.length > 0 ? room.gallery : [room.image];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Dynamic Hero Image Slider */}
      <section className="relative h-[80vh] overflow-hidden">
        <HeroSlider images={images} name={room.name} />
        <div className="absolute inset-0 bg-gradient-overlay pointer-events-none" />
        <div className="absolute bottom-16 left-0 w-full z-10 pointer-events-none">
          <div className="max-w-7xl mx-auto px-6">
            <Link to="/rooms" className="text-gold/80 text-xs uppercase tracking-widest inline-flex items-center gap-2 hover:text-gold mb-4 pointer-events-auto">
              <ArrowLeft size={14} /> All Rooms
            </Link>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{room.tagline}</p>
            <h1 className="font-serif text-5xl md:text-7xl font-bold text-foreground drop-shadow-md">{room.name}</h1>
          </div>
        </div>
      </section>

      {/* Split-Column Feature Layout */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-12">
            <div>
              <h2 className="font-serif text-3xl mb-4 text-foreground">About this room</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">{room.description}</p>
            </div>

            {/* Specifications Grid */}
            <div className="grid sm:grid-cols-3 gap-4 py-8 border-y border-border">
              <Detail label="Room Size" value={room.size} icon={<Maximize size={20} />} />
              <Detail label="Bedding Setup" value={room.beds} icon={<Bed size={20} />} />
              <Detail label="Max Capacity" value={`${room.capacity} Guests`} icon={<Users size={20} />} />
            </div>

            {/* Amenities Grid */}
            <div>
              <h3 className="font-serif text-2xl mb-6 text-foreground">Premium Amenities</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {room.amenities.map((a: string) => (
                  <div key={a} className="flex items-center gap-4 bg-onyx/40 border border-border/60 p-4 hover:border-gold/30 hover:bg-onyx/60 transition-all duration-300">
                    <div className="bg-gold/10 p-2.5 rounded text-gold shrink-0">
                      {getAmenityIcon(a)}
                    </div>
                    <span className="text-muted-foreground text-sm uppercase tracking-wider font-medium">{a}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* In-page small gallery fallback/display */}
            {room.gallery && room.gallery.length > 1 && (
              <div>
                <h3 className="font-serif text-2xl mb-6 text-foreground">Room Gallery</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {room.gallery.map((src: string, i: number) => (
                    <a key={i} href={src} target="_blank" rel="noreferrer" className="group block overflow-hidden aspect-[4/3] border border-border hover:border-gold/40 transition-colors">
                      <img src={src} alt={`${room.name} view ${i + 1}`} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Sticky Reservation Card) */}
          <aside className="lg:sticky lg:top-28 self-start">
            <ReservationCard room={room} />
          </aside>
        </div>
      </section>

      {/* Other Rooms Carousel / Grid */}
      <section className="py-20 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-serif text-3xl mb-8 text-foreground">Explore Other Accommodations</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {rooms.filter((r) => r.slug !== room.slug).map((r) => (
              <Link key={r.slug} to="/rooms/$slug" params={{ slug: r.slug }} className="group bg-onyx border border-border hover:border-gold/50 flex flex-col h-full overflow-hidden transition-all duration-300 hover-glow">
                <div className="overflow-hidden aspect-[4/3]">
                  <img src={r.image} alt={r.name} loading="lazy" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-serif text-xl group-hover:text-gold transition-colors">{r.name}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{r.tagline}</p>
                  </div>
                  <p className="text-gold font-serif text-lg mt-4">{formatNaira(r.price)} / night</p>
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
