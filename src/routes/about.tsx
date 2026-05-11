import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import lobby from "@/assets/lobby.jpg";
import hero from "@/assets/hero-exterior.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Remeritona Hotel and Suites Abakaliki" },
      { name: "description", content: "The story of Remeritona Hotel — Ebonyi State's industrial-chic luxury landmark in Abakaliki, Nigeria." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative h-[60vh] overflow-hidden">
        <img src={hero} alt="Remeritona Hotel exterior" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-overlay" />
        <div className="relative z-10 h-full flex items-end max-w-7xl mx-auto px-6 pb-12">
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">Our Story</p>
            <h1 className="font-serif text-5xl md:text-7xl">A landmark of Ebonyi.</h1>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-6 text-lg leading-relaxed text-muted-foreground">
          <p>
            Remeritona Hotel and Suites was born of a simple ambition: to create a destination
            that reflects Abakaliki's industrious soul and Ebonyi State's quiet sophistication.
          </p>
          <p>
            Inspired by the bones of Abakaliki's working past — its quarries, its craftsmen, its
            steady rise — our architects layered exposed brick and steel with golden warmth and
            plush comfort. The result is a property that feels both grounded and elevated, both
            local and quietly worldly.
          </p>
          <p>
            From quiet weekday suites to grand state dinners in our ballroom, every space at
            Remeritona is shaped by hospitality that is unmistakably Nigerian — generous,
            attentive, and proud.
          </p>
        </div>
      </section>

      <section className="py-20 px-6 bg-charcoal">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <img src={lobby} alt="Hotel lobby" className="w-full aspect-[4/3] object-cover" loading="lazy" />
          <div>
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Nearby Landmarks</p>
            <h2 className="font-serif text-4xl mb-4">In the heart of Abakaliki</h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Set in central Abakaliki, Remeritona is moments from Ebonyi's leading institutions,
              markets and venues — making it the ideal base for business and leisure travellers alike.
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li>· Ebonyi State University (Permanent Site)</li>
              <li>· Abakaliki International Market (Kpirikpiri Market)</li>
              <li>· Ebonyi State Stadium (Pa Ngele Oruta Stadium)</li>
              <li>· Ebonyi Shopping Mall (Shoprite Abakaliki)</li>
              <li>· Abakaliki Rice Mill</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Facilities</p>
          <h2 className="font-serif text-4xl md:text-5xl mb-12">All under one roof</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { t: "Fine Dining", d: "Two restaurants, one exclusive bar." },
              { t: "Spa & Wellness", d: "Full-service spa and treatment rooms." },
              { t: "Infinity Pool", d: "Infinity pool with skyline views." },
              { t: "Events", d: "500-seat ballroom + boardrooms." },
              { t: "Fitness", d: "24-hour gym with personal trainers." },
              { t: "Concierge", d: "Bespoke city tours and transfers." },
              { t: "Business", d: "Co-working lounge and meeting rooms." },
              { t: "Security", d: "24-hour managed security and parking." },
            ].map((f) => (
              <div key={f.t} className="border border-border p-6 hover:border-gold/40 transition-colors">
                <h3 className="font-serif text-xl text-gold mb-2">{f.t}</h3>
                <p className="text-sm text-muted-foreground">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
