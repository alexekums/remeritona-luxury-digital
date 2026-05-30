import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getMenuItems } from "@/functions/portal.functions";
import { formatNaira } from "@/data/rooms";
import dining from "@/assets/dining.jpg";
import pool from "@/assets/pool.jpg";
import spa from "@/assets/spa.jpg";

export const Route = createFileRoute("/dining")({
  head: () => ({
    meta: [
      { title: "Dining & Facilities — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Restaurants, bar, spa and wellness facilities at Remeritona Hotel and Suites in Abakaliki." },
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
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const result = await getMenuItems() as { success?: boolean; items?: any[] };
        if (result?.items) setMenuItems(result.items);
        else setMenuError(true);
      } catch {
        setMenuError(true);
      } finally {
        setMenuLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(
    () => [...new Set(menuItems.map((i) => i.category).filter(Boolean))].sort(),
    [menuItems]
  );

  const filteredMenu =
    categoryFilter === "all"
      ? menuItems
      : menuItems.filter((i) => i.category === categoryFilter);

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

      <section className="py-16 px-6 bg-charcoal/50 border-t border-border">
        <div className="max-w-4xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3 text-center">In-Room Dining Menu</p>
          <h2 className="font-serif text-3xl text-center mb-10">Current Menu</h2>

          {menuLoading && (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-16 bg-muted/30 animate-pulse rounded" />
              ))}
            </div>
          )}

          {menuError && !menuLoading && (
            <p className="text-center text-muted-foreground">Menu temporarily unavailable</p>
          )}

          {!menuLoading && !menuError && menuItems.length > 0 && (
            <>
              <div className="flex flex-wrap gap-2 justify-center mb-10">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-4 py-2 text-xs uppercase tracking-widest border ${categoryFilter === "all" ? "border-gold text-gold" : "border-border text-muted-foreground"}`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 text-xs uppercase tracking-widest border ${categoryFilter === cat ? "border-gold text-gold" : "border-border text-muted-foreground"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {filteredMenu.map((item) => (
                  <div key={item.id} className="flex justify-between items-start gap-4 border-b border-border/50 pb-4">
                    <div>
                      <h3 className="font-serif text-lg">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      )}
                      <span className="text-xs text-gold/80 uppercase tracking-wider mt-1 inline-block">{item.category}</span>
                    </div>
                    <span className="text-gold font-medium whitespace-nowrap">{formatNaira(item.price)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
