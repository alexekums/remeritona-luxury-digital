import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { findBooking, refundPolicy, saveBooking, type StoredBooking } from "@/data/bookings-store";
import { formatNaira } from "@/data/rooms";
import { Search, ShieldCheck, AlertTriangle, Check } from "lucide-react";
import { cancelBooking } from "@/functions/cancelBooking";

export const Route = createFileRoute("/my-bookings")({
  head: () => ({
    meta: [
      { title: "Manage Your Booking — Remeritona Hotel" },
      { name: "description", content: "Look up your reservation and cancel if needed." },
    ],
  }),
  component: MyBookingsPage,
});

function MyBookingsPage() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState<StoredBooking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCancelMessage(null);
    const b = findBooking(reference, email);
    if (!b) {
      setBooking(null);
      setError("We couldn't find a booking with that reference and email. Please double-check both.");
      return;
    }
    setBooking(b);
  };

  const policy = booking ? refundPolicy(booking.checkIn) : null;

  const handleCancel = async () => {
    if (!booking || !policy) return;
    setProcessing(true);
    const refundAmount = Math.round((booking.amountCharged * policy.percent) / 100);
    try {
      const result = await cancelBooking({
        data: {
          reference: booking.reference,
          gateway: booking.gateway,
          refundAmount,
          guestEmail: booking.guest.email,
          guestName: booking.guest.name,
          roomName: booking.roomName,
          checkIn: new Date(booking.checkIn).toLocaleDateString("en-NG", { dateStyle: "long" }),
          total: booking.total,
        }
      });
      setProcessing(false);
      if (!result.success) {
        setError(`Refund failed: ${result.error ?? "unknown error"}`);
        return;
      }
      const updated: StoredBooking = {
        ...booking,
        status: "cancelled",
        cancellation: {
          cancelledAt: new Date().toISOString(),
          refundPercent: policy.percent,
          refundAmount,
        },
      };
      saveBooking(updated);
      setBooking(updated);
      setShowConfirm(false);
      setCancelMessage(
        refundAmount > 0
          ? `Booking cancelled. A refund of ${formatNaira(refundAmount)} (${policy.percent}%) has been initiated via ${booking.gateway === "paystack" ? "Paystack" : "Flutterwave"}.`
          : "Booking cancelled. Per policy, no refund is due.",
      );
    } catch (err) {
      setProcessing(false);
      setError("Cancellation failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="pt-40 pb-12 px-6 bg-charcoal">
        <div className="max-w-3xl mx-auto">
          <p className="text-gold text-xs uppercase tracking-[0.4em] mb-3">My Bookings</p>
          <h1 className="font-serif text-4xl md:text-5xl mb-3">Manage your reservation</h1>
          <p className="text-muted-foreground">Enter your booking reference and email to view or cancel your reservation.</p>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleLookup} className="bg-charcoal border border-border p-6 grid sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest text-gold">Booking Reference</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="REMERITONA-…"
                className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-widest text-gold">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="bg-onyx border border-border px-3 py-3 text-foreground focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-gold text-primary-foreground font-semibold uppercase tracking-widest text-sm hover:bg-gold-soft inline-flex items-center gap-2"
              >
                <Search size={16} /> Find my booking
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-4 text-gold border border-gold/40 bg-onyx px-4 py-3 text-sm inline-flex items-center gap-2">
              <AlertTriangle size={16} /> {error}
            </p>
          )}

          {cancelMessage && (
            <p className="mt-6 text-gold border border-gold/40 bg-onyx px-4 py-4 text-sm inline-flex items-center gap-2">
              <Check size={16} /> {cancelMessage}
            </p>
          )}

          {booking && (
            <div className="mt-8 bg-charcoal border border-gold/30 p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-gold text-xs uppercase tracking-[0.4em]">Reservation</p>
                <span
                  className={`text-xs uppercase tracking-widest px-3 py-1 border ${
                    booking.status === "cancelled"
                      ? "border-destructive/50 text-destructive"
                      : booking.status === "scheduled"
                      ? "border-gold/40 text-gold"
                      : "border-gold/40 text-gold"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <h2 className="font-serif text-2xl mb-2">{booking.roomName}</h2>
              <p className="text-sm text-muted-foreground mb-4">Reference: {booking.reference}</p>

              <div className="grid sm:grid-cols-2 gap-2 text-sm border-t border-border pt-4">
                <Row label="Check-in" value={new Date(booking.checkIn).toLocaleDateString()} />
                <Row label="Check-out" value={new Date(booking.checkOut).toLocaleDateString()} />
                <Row label="Nights" value={String(booking.nights)} />
                <Row label="Rooms" value={String(booking.numRooms)} />
                <Row label="Guests" value={String(booking.guests)} />
                <Row label="Gateway" value={booking.gateway === "paystack" ? "Paystack" : "Flutterwave"} />
                <Row label="Total" value={formatNaira(booking.total)} />
                <Row label="Paid so far" value={formatNaira(booking.amountCharged)} />
                {booking.paymentMode === "save_card" && (
                  <Row
                    label="Pending balance"
                    value={formatNaira(booking.pendingBalance ?? 0)}
                  />
                )}
              </div>

              {booking.cancellation ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  Cancelled on {new Date(booking.cancellation.cancelledAt).toLocaleString()} —
                  refund {formatNaira(booking.cancellation.refundAmount)} ({booking.cancellation.refundPercent}%).
                </p>
              ) : (
                policy && (
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground mb-3">{policy.label}</p>
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="px-6 py-3 bg-destructive text-destructive-foreground font-semibold uppercase tracking-widest text-sm hover:opacity-90"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {showConfirm && booking && policy && (
        <div className="fixed inset-0 bg-onyx/80 backdrop-blur-sm z-[60] grid place-items-center px-4">
          <div className="bg-charcoal border border-gold/40 max-w-md w-full p-6">
            <p className="text-gold text-xs uppercase tracking-[0.4em] mb-2">Confirm Cancellation</p>
            <h3 className="font-serif text-2xl mb-3">Cancel this reservation?</h3>
            <p className="text-sm text-muted-foreground mb-4">{policy.label}</p>
            <div className="bg-onyx border border-border p-4 text-sm space-y-1">
              <Row label="Charged" value={formatNaira(booking.amountCharged)} />
              <Row label="Refund %" value={`${policy.percent}%`} />
              <Row
                label="Refund amount"
                value={formatNaira(Math.round((booking.amountCharged * policy.percent) / 100))}
                highlight
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-5 py-2.5 border border-border uppercase tracking-widest text-xs hover:border-gold"
              >
                Keep booking
              </button>
              <button
                onClick={handleCancel}
                disabled={processing}
                className="px-5 py-2.5 bg-destructive text-destructive-foreground uppercase tracking-widest text-xs font-semibold disabled:opacity-50"
              >
                {processing ? "Processing…" : "Confirm Cancel"}
              </button>
            </div>
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-4">
              <ShieldCheck size={12} className="text-gold" /> Refunds are processed via the original gateway
            </p>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "text-gold font-serif text-base" : "text-foreground"}>{value}</span>
    </div>
  );
}
