import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookingWidget } from "@/components/BookingWidget";
import { rooms, formatNaira } from "@/data/rooms";
import { galleryImages } from "@/data/gallery";
import heroImage from "@/assets/hero-exterior.jpg";
import lobbyImage from "@/assets/lobby.jpg";
import { ArrowRight, Award, Sparkles, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Remeritona Hotel and Suites — Luxury Stay in Abakaliki" },
      { name: "description", content: "Book your stay at Remeritona Hotel and Suites — industrial-chic luxury in Abakaliki, Ebonyi State. Real-time availability, signature suites, fine dining." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative min-h-[100vh] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt="Remeritona Hotel exterior at dusk"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="absolute inset-0 bg-onyx/30" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-12 w-full">
          <div className="max-w-3xl mb-12">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Abakaliki · Ebonyi State</p>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl text-foreground leading-[1.05] mb-6">
              Where heritage<br />meets <em className="text-gold not-italic">luxury</em>.
            </h1>
            <p className="text-foreground/85 text-lg md:text-xl max-w-xl leading-relaxed">
              An industrial-chic sanctuary in the heart of Ebonyi State — refined rooms, soulful dining, and unmistakably Nigerian hospitality.
            </p>
          </div>

          <BookingWidget />
        </div>
      </section>

      {/* Story */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Our Story</p>
            <h2 className="font-serif text-4xl md:text-5xl mb-6 leading-tight">
              A modern landmark, rooted in Ebonyi.
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-5">
              Remeritona was conceived as a tribute to Abakaliki's industrious spirit — a place where raw materials, craftsmanship, and ambition come together. Every steel beam, every brick, every gold detail tells a story of Ebonyi rising.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              Today we welcome travelers, dignitaries and dreamers into a space that is unapologetically luxurious — and unmistakably ours.
            </p>
            <Link to="/about" className="inline-flex items-center gap-2 text-gold uppercase tracking-widest text-sm hover:gap-4 transition-all">
              Read our story <ArrowRight size={16} />
            </Link>
          </div>
          <div className="relative">
            <img src={lobbyImage} alt="Hotel lobby" className="w-full aspect-[4/5] object-cover" loading="lazy" width={1280} height={832} />
            <div className="absolute -bottom-6 -left-6 bg-gold text-primary-foreground p-6 hidden md:block">
              <p className="font-serif text-4xl">15+</p>
              <p className="text-xs uppercase tracking-widest mt-1">Years of hospitality</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Rooms */}
      <section className="py-24 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Accommodations</p>
              <h2 className="font-serif text-4xl md:text-5xl">Signature Rooms & Suites</h2>
            </div>
            <Link to="/rooms" className="text-gold uppercase tracking-widest text-sm inline-flex items-center gap-2 hover:gap-4 transition-all">
              View all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Link
                key={room.slug}
                to="/rooms/$slug"
                params={{ slug: room.slug }}
                className="group bg-onyx border border-border hover:border-gold/50 transition-all"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={room.image} alt={room.name} loading="lazy" width={1280} height={832}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-2xl mb-2 group-hover:text-gold transition-colors">{room.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.tagline}</p>
                  <div className="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">From</p>
                      <p className="text-gold font-serif text-2xl">{formatNaira(room.price)}</p>
                    </div>
                    <span className="text-xs uppercase tracking-widest text-gold inline-flex items-center gap-1.5">
                      Book <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Remeritona */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">The Remeritona Difference</p>
            <h2 className="font-serif text-4xl md:text-5xl">Crafted with intention</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { icon: <Award size={32} />, title: "Bespoke Service", desc: "A personal concierge anticipates every need, from arrival to farewell." },
              { icon: <Sparkles size={32} />, title: "Industrial Elegance", desc: "Architectural detail meets warm Nigerian hospitality in every room." },
              { icon: <MapPin size={32} />, title: "Prime Abakaliki", desc: "Steps from the city's business district, embassies and cultural sites." },
            ].map((f) => (
              <div key={f.title} className="text-center p-8 border border-border hover:border-gold/40 transition-colors">
                <div className="text-gold inline-flex mb-5">{f.icon}</div>
                <h3 className="font-serif text-2xl mb-3">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offers strip */}
      <section className="py-24 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {[
            { tag: "Weekend Escape", title: "20% off two-night stays", desc: "Friday – Sunday. Includes breakfast for two and a sundowner cocktail." },
            { tag: "Extended Stay", title: "Stay 5, pay for 4", desc: "Perfect for business travelers and long-term visitors to Abakaliki." },
          ].map((o) => (
            <div key={o.title} className="p-10 border border-gold/30 bg-onyx hover:bg-onyx/60 transition-colors">
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{o.tag}</p>
              <h3 className="font-serif text-3xl mb-3">{o.title}</h3>
              <p className="text-muted-foreground mb-6">{o.desc}</p>
              <Link to="/offers" className="text-gold uppercase tracking-widest text-sm inline-flex items-center gap-2 hover:gap-4 transition-all">
                See offer <ArrowRight size={16} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Instagram-style gallery */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">@remeritona</p>
            <h2 className="font-serif text-4xl md:text-5xl">Moments from Remeritona</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {galleryImages.slice(0, 6).map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden group">
                <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/gallery" className="inline-block px-8 py-3 border border-gold text-gold uppercase tracking-widest text-sm hover:bg-gold hover:text-primary-foreground transition-colors">
              View full gallery
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-gold text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl md:text-6xl mb-6">Reserve your stay</h2>
          <p className="text-lg mb-8 opacity-90">Real-time availability. Best rate guaranteed when you book direct.</p>
          <Link to="/booking" className="inline-block px-10 py-4 bg-onyx text-gold uppercase tracking-widest text-sm font-semibold hover:bg-charcoal transition-colors">
            Check availability
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
