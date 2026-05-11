import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Special Offers — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Exclusive packages and seasonal offers at Remeritona Hotel and Suites — book direct for the best rate guaranteed." },
    ],
  }),
  component: OffersPage,
});

const offers = [
  { tag: "Weekend Escape", title: "20% off two-night weekends", desc: "Stay Friday to Sunday and enjoy daily breakfast for two and a complimentary sundowner cocktail at our exclusive bar.", terms: "Subject to availability. Non-refundable." },
  { tag: "Extended Stay", title: "Stay 5, pay for 4", desc: "Designed for visiting executives and long-term travelers. Includes laundry, daily breakfast, and 25% off dining.", terms: "Minimum 5-night stay. Excludes Presidential Suite." },
  { tag: "Honeymoon", title: "Romance Package", desc: "Champagne on arrival, a couple's spa treatment, in-suite candlelit dinner, and late checkout.", terms: "Available in Executive and Presidential suites." },
  { tag: "Government & Corporate", title: "Negotiated rates", desc: "Bespoke rates and meeting space for state delegations, ministries and corporate accounts.", terms: "Contact our sales team to set up an account." },
];

function OffersPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-16 px-6 bg-charcoal text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Direct Rate Guarantee</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-4">Special Offers</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Hand-picked packages, only when you book direct.
        </p>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-6">
          {offers.map((o) => (
            <article key={o.title} className="p-10 border border-border hover:border-gold/50 transition-colors bg-charcoal">
              <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">{o.tag}</p>
              <h2 className="font-serif text-3xl mb-4">{o.title}</h2>
              <p className="text-muted-foreground mb-4">{o.desc}</p>
              <p className="text-xs text-muted-foreground italic mb-6">{o.terms}</p>
              <Link to="/booking" className="text-gold uppercase tracking-widest text-sm inline-flex items-center gap-2 hover:gap-4 transition-all">
                Book this offer <ArrowRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
