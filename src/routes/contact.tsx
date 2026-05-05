import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Remeritona Hotel Abakaliki" },
      { name: "description", content: "Reach the Remeritona Hotel team in Abakaliki. Reservations, events, and concierge inquiries." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [sent, setSent] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="pt-40 pb-16 px-6 bg-charcoal text-center">
        <p className="text-gold text-xs uppercase tracking-[0.4em] mb-4">Get in touch</p>
        <h1 className="font-serif text-5xl md:text-6xl">We're here to help.</h1>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <ContactItem icon={<MapPin />} title="Address" lines={["Refinery Road, Abakaliki", "Ebonyi State, Nigeria"]} />
            <ContactItem icon={<Phone />} title="Phone" lines={["+234 800 123 4567", "+234 802 987 6543 (Reservations)"]} />
            <ContactItem icon={<Mail />} title="Email" lines={["info@remeritona.com", "reservations@remeritona.com"]} />

            <div className="aspect-video w-full overflow-hidden border border-border">
              <iframe
                title="Remeritona Hotel location"
                src="https://www.google.com/maps?q=Abakaliki,Ebonyi+State,Nigeria&output=embed"
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="bg-charcoal border border-border p-8 space-y-4"
          >
            <h2 className="font-serif text-2xl mb-4">Send us a message</h2>
            {sent ? (
              <div className="border border-gold/30 p-6 text-center">
                <p className="text-gold uppercase tracking-widest text-xs mb-2">Message sent</p>
                <p className="text-muted-foreground">Our team will be in touch shortly.</p>
              </div>
            ) : (
              <>
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Phone" name="phone" />
                <div>
                  <label className="text-xs uppercase tracking-widest text-gold">Message *</label>
                  <textarea required rows={5} maxLength={1000}
                    className="w-full mt-1.5 bg-onyx border border-border px-3 py-2 focus:border-gold focus:outline-none" />
                </div>
                <button type="submit" className="w-full px-6 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft inline-flex items-center justify-center gap-2">
                  <Send size={16} /> Send Message
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ContactItem({ icon, title, lines }: { icon: React.ReactNode; title: string; lines: string[] }) {
  return (
    <div className="flex gap-4">
      <span className="w-12 h-12 grid place-items-center border border-gold text-gold shrink-0">{icon}</span>
      <div>
        <p className="text-xs uppercase tracking-widest text-gold mb-2">{title}</p>
        {lines.map((l) => <p key={l} className="text-muted-foreground">{l}</p>)}
      </div>
    </div>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-widest text-gold">{label}{required && " *"}</label>
      <input name={name} type={type} required={required} maxLength={255}
        className="w-full mt-1.5 bg-onyx border border-border px-3 py-2 focus:border-gold focus:outline-none" />
    </div>
  );
}
