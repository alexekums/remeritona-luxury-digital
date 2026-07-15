import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { galleryImages } from "@/data/gallery";
import { X } from "lucide-react";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Explore the rooms, dining, facilities and event spaces of Remeritona Hotel and Suites in Abakaliki." },
    ],
  }),
  component: GalleryPage,
});

const categories = ["All", "Interior", "Rooms", "Restaurant", "Facilities", "Events", "Exterior"];

function GalleryPage() {
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const items = filter === "All" ? galleryImages : galleryImages.filter((i) => i.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-12 px-6 bg-zinc-900 text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Visual Stories</p>
        <h1 className="font-serif text-5xl md:text-6xl">Gallery</h1>
      </section>

      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)}
                className={`px-5 py-2 text-xs uppercase tracking-widest border transition-colors ${
                  filter === c ? "bg-gold border-gold text-primary-foreground" : "border-border hover:border-gold"
                }`}>{c}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((img, i) => (
              <button key={i} onClick={() => setOpen(i)} className="group relative overflow-hidden aspect-square">
                <img src={img.src} alt={img.alt} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-zinc-900/0 group-hover:bg-zinc-900/60 transition-colors grid place-items-center">
                  <span className="text-gold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100">{img.category}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {open !== null && (
        <div className="fixed inset-0 z-50 bg-zinc-900/95 grid place-items-center p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-6 right-6 text-foreground hover:text-gold" onClick={() => setOpen(null)}><X size={32} /></button>
          <img src={items[open].src} alt={items[open].alt} className="max-h-[90vh] max-w-[95vw] object-contain" />
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
