import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import dining from "@/assets/dining.jpg";
import pool from "@/assets/pool.jpg";
import spa from "@/assets/spa.jpg";

export const Route = createFileRoute("/dining")({
  head: () => ({
    meta: [
      { title: "Dining & Facilities — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Restaurants, <Remeritona></Remeritona> bar, spa and wellness facilities at Remeritona Hotel and Suites in Abakaliki." },
    ],
  }),
  component: DiningPage,
});

const venues = [
  { img: dining, tag: "Signature Restaurant", name: "The Foundry", desc: "A modern Nigerian kitchen serving refined takes on Igbo classics alongside continental favorites. Open daily for breakfast, lunch and dinner." },
  { img: pool, tag: "Remeritona Bar", name: "Premium", desc: "Cocktails, small plates and Flex." },
  { img: spa, tag: "Wellness", name: "Remeritona Spa", desc: "Full-service spa with massage, facials, sauna and steam. By appointment." },
];

function DiningPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-16 px-6 bg-charcoal text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Dining & Facilities</p>
        <h1 className="font-serif text-5xl md:text-6xl">Taste, rest, restore.</h1>
      </section>

      <section className="py-20 px-6 space-y-16">
        <div className="max-w-7xl mx-auto space-y-20">
          {venues.map((v, i) => (
            <article key={v.name} className={`grid lg:grid-cols-2 gap-10 items-center ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <img src={v.img} alt={v.name} loading="lazy" className="w-full aspect-[4/3] object-cover" />
              <div>
                <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">{v.tag}</p>
                <h2 className="font-serif text-4xl mb-4">{v.name}</h2>
                <p className="text-muted-foreground text-lg leading-relaxed">{v.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
