import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  Clock,
  XCircle,
  Baby,
  PawPrint,
  Car,
  Cigarette,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/policies")({
  head: () => ({
    meta: [
      { title: "Hotel Rules & Policies — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Check-in, cancellation, children, pets, parking and house rules at Remeritona Hotel and Suites, Abakaliki." },
    ],
  }),
  component: PoliciesPage,
});

const policies = [
  {
    icon: Clock,
    title: "Check-in & Check-out",
    body: (
      <>
        <p><span className="text-foreground">Check-in:</span> From 3:00 PM</p>
        <p><span className="text-foreground">Check-out:</span> Until 11:00 AM</p>
        <p className="mt-2">Early check-in and late check-out are subject to availability and may incur additional charges.</p>
      </>
    ),
  },
  {
    icon: XCircle,
    title: "Cancellation & Prepayment",
    body: (
      <>
        <p>Free cancellation up to 48 hours before arrival.</p>
        <p>Later cancellation or no-show: 100% of the first night will be charged.</p>
        <p className="mt-2">A 50% deposit is required to secure your booking.</p>
      </>
    ),
  },
  {
    icon: Baby,
    title: "Children & Extra Beds",
    body: (
      <>
        <p>All children are welcome.</p>
        <p>Extra beds and cribs are available upon request and may incur additional charges.</p>
        <p className="mt-2">Maximum room occupancy: 2 Adults + 1 Extra Bed + 1 Child.</p>
      </>
    ),
  },
  {
    icon: PawPrint,
    title: "Pets",
    body: <p>Pets are not allowed on the property.</p>,
  },
  {
    icon: Car,
    title: "Parking",
    body: <p>Free private parking is available on site for all guests.</p>,
  },
  {
    icon: Cigarette,
    title: "Smoking",
    body: <p>All rooms and indoor areas are strictly non-smoking.</p>,
  },
  {
    icon: ShieldCheck,
    title: "Other House Rules",
    body: (
      <ul className="space-y-1 list-disc list-inside">
        <li>Daily housekeeping service</li>
        <li>24/7 reception and concierge</li>
        <li>Respectful conduct towards staff and other guests is required</li>
        <li>CCTV surveillance across all public areas for guest safety</li>
        <li>Quiet hours observed from 10:00 PM to 7:00 AM</li>
        <li>Valid government-issued ID required at check-in</li>
      </ul>
    ),
  },
];

function PoliciesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-16 px-6 bg-charcoal text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Hotel Information</p>
        <h1 className="font-serif text-5xl md:text-6xl mb-4">Rules & Policies</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know before your stay at Remeritona Hotel and Suites.
        </p>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {policies.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="border border-border p-8 hover:border-gold/50 transition-colors bg-charcoal/40"
            >
              <div className="w-12 h-12 grid place-items-center border border-gold text-gold mb-5">
                <Icon size={22} />
              </div>
              <h2 className="font-serif text-2xl mb-3">{title}</h2>
              <div className="text-muted-foreground text-sm leading-relaxed space-y-1">
                {body}
              </div>
            </article>
          ))}
        </div>

        <div className="max-w-5xl mx-auto mt-10 border border-gold/30 p-6 text-center text-sm text-muted-foreground">
          For special requests or any questions about our policies, please contact reception at{" "}
          <a href="tel:09122999845" className="text-gold hover:underline">09122999845</a>{" "}or{" "}
          <a href="tel:09130844222" className="text-gold hover:underline">09130844222</a>.
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
