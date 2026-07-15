import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import ballroomImage from "/Remeritona Hotel Gallery/Event Hall/IMG-20260713-WA0015.webp";
import summitImage from "/Remeritona Hotel Gallery/Conference hall/IMG_7044.webp";
import boardroomImage from "/Remeritona Hotel Gallery/Conference room/IMG_6890.webp";
import poolImage from "/Remeritona Hotel Gallery/Pool/IMG_6956.webp";
import penthouseImage from "/Remeritona Hotel Gallery/Conference hall/IMG_7046.webp";
import { ArrowRight, Users } from "lucide-react";

export const Route = createFileRoute("/halls")({
  head: () => ({
    meta: [
      { title: "Halls & Venues — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Explore and book our luxury event spaces, halls, and meeting rooms at Remeritona Hotel and Suites, Abakaliki." },
    ],
  }),
  component: HallsShowcasePage,
});

const spaces = [
  {
    id: "ballroom",
    name: "The Grand Imperial Ballroom",
    capacity: "800 Guests",
    bestFor: "Grand galas, banquets, and weddings.",
    desc: "Make your grandest events unforgettable in our flagship Imperial Ballroom. Adorned with high ceilings, luxurious acoustic paneling, and customizable staging, this majestic space hosts up to 800 guests in banquet or theater configurations.",
    img: ballroomImage,
    bookingType: "banquet_hall",
  },
  {
    id: "penthouse",
    name: "The Penthouse Auditorium",
    capacity: "300 Guests",
    bestFor: "Seminars, product launches, and conferences.",
    desc: "A red theater auditorium-style hall offering built-in screen projectors, high-fidelity audio, and luxury tiered seating. Perfect for seminars, presentations, and large corporate events.",
    img: penthouseImage,
    bookingType: "penthouse",
  },
  {
    id: "summit",
    name: "The Executive Summit Suite",
    capacity: "150 Guests",
    bestFor: "Seminars, conferences, and medium banquets.",
    desc: "Designed for premium seminars, professional conferences, and private banquets. The Executive Summit Suite offers an integrated audio-visual system, adjustable configurations, and elegant modern interiors to ensure a productive and polished event.",
    img: summitImage,
    bookingType: "conference_hall",
  },
  {
    id: "boardroom",
    name: "The Onyx Boardroom",
    capacity: "25 Guests",
    bestFor: "High-stakes meetings and private discussions.",
    desc: "A premium private sanctuary crafted for executive decisions. Featuring a stately round-table setup, comfortable leather seating, high-definition display, and absolute acoustic privacy to guarantee focused high-level discussions.",
    img: boardroomImage,
    bookingType: "board_room",
  },
  {
    id: "poolside",
    name: "The Poolside Reception Hall",
    capacity: "200 Guests",
    bestFor: "Outdoor receptions, parties, and cocktail events.",
    desc: "Celebrate under the sky. Our premium poolside area offers breeze-filled evening views, dynamic lighting setups, and customizable staging — a fantastic option for parties, outdoor dinners, and wedding receptions.",
    img: poolImage,
    bookingType: "pool_hall",
  },
];

function HallsShowcasePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <section className="pt-40 pb-16 px-6 bg-zinc-900 text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Event Venues</p>
        <h1 className="font-serif text-5xl md:text-6xl text-foreground">Grand Spaces for Grand Occasions</h1>
      </section>

      {/* Alternating Showcase List */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-24">
          {spaces.map((space, i) => (
            <article
              key={space.id}
              className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
            >
              <div className="overflow-hidden aspect-[4/3] border border-border/80">
                <img
                  src={space.img}
                  alt={space.name}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-[1.5s]"
                />
              </div>
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-3 text-gold text-xs uppercase tracking-widest mb-3">
                    <span className="flex items-center gap-1"><Users size={14} /> {space.capacity}</span>
                    <span>•</span>
                    <span>{space.bestFor}</span>
                  </div>
                  <h2 className="font-serif text-4xl mb-4 text-foreground">{space.name}</h2>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">{space.desc}</p>
                <div className="pt-4">
                  <Link
                    to="/venue-booking"
                    search={{ type: space.bookingType } as never}
                    className="px-6 py-3.5 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-xs hover:bg-gold-soft transition-colors inline-flex items-center gap-2"
                  >
                    Reserve Space <ArrowRight size={14} />
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
