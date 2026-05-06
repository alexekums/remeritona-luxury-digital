import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingWidget } from "@/components/BookingWidget";
import { rooms, formatNaira } from "@/data/rooms";
import heroImage from "@/assets/hero-exterior.jpg";
import diningImage from "@/assets/dining.jpg";
import poolImage from "@/assets/pool.jpg";
import {
  ArrowRight,
  Waves,
  UtensilsCrossed,
  Wifi,
  Sparkles,
  Users,
  BellRing,
  Dumbbell,
  Plane,
  Star,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Re Meritona Hotel & Suites — Luxury Stay in Abakaliki" },
      { name: "description", content: "Where elegance meets comfort in the heart of Abakaliki. Book luxurious rooms, fine dining and world-class amenities at Re Meritona Hotel & Suites." },
    ],
  }),
  component: Index,
});

const amenities = [
  { icon: Waves, label: "Swimming Pool" },
  { icon: UtensilsCrossed, label: "Restaurant & Bar" },
  { icon: Wifi, label: "Free Wi-Fi" },
  { icon: Sparkles, label: "Spa & Wellness" },
  { icon: Users, label: "Conference Room" },
  { icon: BellRing, label: "24hr Room Service" },
  { icon: Dumbbell, label: "Gym" },
  { icon: Plane, label: "Airport Shuttle" },
];

const testimonials = [
  { quote: "An absolutely stunning hotel. The rooms are world-class and the staff incredibly warm.", name: "Chukwuemeka A.", city: "Enugu" },
  { quote: "Best hospitality experience in Ebonyi State. I felt like royalty from check-in to checkout.", name: "Adaeze O.", city: "Abuja" },
  { quote: "The pool, the food, the service — everything was perfect. We will definitely be back.", name: "James I.", city: "Lagos" },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        <img
          src={heroImage}
          alt="Re Meritona Hotel exterior in Abakaliki"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-20 w-full text-center">
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-black text-foreground leading-[1.1] mb-6">
            Where Elegance Meets Comfort<br />in the Heart of Abakaliki
          </h1>
          <p className="text-gold italic font-serif text-2xl md:text-3xl mb-10">
            ...love and refreshment
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/booking"
              className="px-8 py-4 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft hover-glow transition-all"
            >
              Reserve Your Suite
            </Link>
            <Link
              to="/rooms"
              className="px-8 py-4 border-2 border-gold text-gold font-semibold uppercase tracking-widest text-sm hover:bg-gold hover:text-primary-foreground transition-all"
            >
              Explore Rooms
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Booking Bar */}
      <section className="bg-charcoal py-6 px-6 border-y border-gold/20">
        <div className="max-w-7xl mx-auto">
          <BookingWidget variant="inline" />
        </div>
      </section>

      {/* Rooms */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Accommodations</p>
            <h2 className="font-serif text-4xl md:text-5xl">Our Rooms & Suites</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <article key={room.slug} className="group bg-charcoal border border-border hover:border-gold/60 hover-glow transition-all overflow-hidden">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={room.image} alt={room.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl mb-1 group-hover:text-gold transition-colors">{room.name}</h3>
                  <p className="text-sm text-muted-foreground mb-5">{room.tagline}</p>
                  <div className="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
                      <p className="text-gold font-serif text-2xl">{formatNaira(room.price)}<span className="text-xs text-muted-foreground"> /night</span></p>
                    </div>
                    <Link
                      to="/booking"
                      search={{ room: room.slug } as never}
                      className="px-4 py-2.5 bg-gold text-primary-foreground text-xs uppercase tracking-widest font-semibold hover:bg-gold-soft transition-colors"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="py-24 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Amenities</p>
            <h2 className="font-serif text-4xl md:text-5xl">All Under One Roof</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {amenities.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center p-8 bg-background/40 border border-border hover:border-gold/50 hover-glow transition-all">
                <Icon size={40} className="text-gold mb-4" />
                <p className="text-sm uppercase tracking-widest text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dining */}
      <section className="py-24 px-6 bg-background">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <img src={diningImage} alt="The Foundry Restaurant" className="w-full aspect-[4/3] object-cover" loading="lazy" />
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Dining</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-6">The Foundry Restaurant</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Experience refined Nigerian cuisine and continental favorites in an elegant setting. Open daily for breakfast, lunch and dinner.
            </p>
            <Link
              to="/dining"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft hover-glow transition-all"
            >
              View Dining <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Pool teaser */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <img src={poolImage} alt="Pool at Re Meritona" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/65" />
        <div className="relative z-10 text-center px-6 max-w-3xl">
          <h2 className="font-serif text-4xl md:text-5xl mb-4 text-foreground">
            Unwind at Abakaliki's Most Beautiful Poolside
          </h2>
          <p className="text-lg text-foreground/85">
            Rooftop bar, spa, gym and more — all at Re Meritona
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Reviews</p>
            <h2 className="font-serif text-4xl md:text-5xl">What Our Guests Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <figure key={t.name} className="p-8 bg-background/60 border border-border hover:border-gold/40 transition-colors flex flex-col">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={18} className="text-gold" fill="currentColor" />
                  ))}
                </div>
                <blockquote className="text-foreground/90 text-lg leading-relaxed mb-6 flex-1">
                  "{t.quote}"
                </blockquote>
                <figcaption className="pt-4 border-t border-border">
                  <p className="font-serif text-gold">{t.name}</p>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{t.city}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
