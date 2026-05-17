import { createServerFn } from "@tanstack/react-start";
import { Resend } from "resend";

interface CancelData {
  reference: string;
  gateway: string;
  refundAmount: number;
  guestEmail: string;
  guestName: string;
  roomName: string;
  checkIn: string;
  total: number;
}

export const cancelBooking = createServerFn({ method: "POST" })
  .handler(async (ctx) => {
    const data = ctx.data as unknown as CancelData;

    const db = (globalThis as any).remeritona_bookings
      ?? (globalThis as any).__env__?.remeritona_bookings
      ?? (globalThis as any)[Symbol.for("cloudflare:env")]?.remeritona_bookings
      ?? (ctx as any).context?.cloudflare?.env?.remeritona_bookings;

    try {
      if (data.refundAmount > 0) {
        if (data.gateway === "paystack") {
          const res = await fetch("https://api.paystack.co/refund", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transaction: data.reference, amount: data.refundAmount * 100 }),
          });
          const result = await res.json() as any;
          if (!result.status) return { success: false, error: "Paystack refund failed: " + result.message };
        } else if (data.gateway === "flutterwave") {
          const res = await fetch(`https://api.flutterwave.com/v3/transactions/${data.reference}/refund`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: data.refundAmount }),
          });
          const result = await res.json() as any;
          if (result.status !== "success") return { success: false, error: "Flutterwave refund failed: " + result.message };
        }
      }

      if (db) {
        await db.prepare(`UPDATE bookings SET status = 'cancelled', refund_amount = ?, cancelled_at = ? WHERE reference = ?`)
          .bind(data.refundAmount, new Date().toISOString(), data.reference).run();
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: "Remeritona Hotel <onboarding@resend.dev>",
        to: "alexekums@gmail.com",
        subject: `Booking Cancelled - ${data.roomName}`,
        html: `<div style="background:#111;color:#ddd;font-family:sans-serif;padding:20px;"><h2 style="color:#c9a84c;">Booking Cancellation Confirmed</h2><p>Dear ${data.guestName},</p><p>Your reservation for <strong>${data.roomName}</strong> (Check-in: ${data.checkIn}) has been cancelled.</p><p style="color:#c9a84c;">${data.refundAmount > 0 ? "Refund: N" + data.refundAmount.toLocaleString() : "No refund applicable."}</p><p>Reference: ${data.reference}</p></div>`,
      });

      await resend.emails.send({
        from: "Remeritona Hotel <onboarding@resend.dev>",
        to: "alexekums@gmail.com",
        subject: `Booking Cancelled - ${data.guestName}`,
        html: `<h2>Cancellation</h2><p><strong>Guest:</strong> ${data.guestName}</p><p><strong>Room:</strong> ${data.roomName}</p><p><strong>Refund:</strong> N${data.refundAmount.toLocaleString()}</p><p><strong>Reference:</strong> ${data.reference}</p>`,
      });

      return { success: true, refundAmount: data.refundAmount };
    } catch (error) {
      console.error("Cancellation error:", error);
      return { success: false, error: String(error) };
    }
  });