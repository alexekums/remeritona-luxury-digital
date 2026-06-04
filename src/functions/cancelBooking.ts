import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export interface CancelData {
  reference: string;
  gateway: string;
  refundAmount: number;
  guestEmail: string;
  guestName: string;
  roomName: string;
  checkIn: string;
  total: number;
}

export const lookupBooking = createServerFn({ method: "POST" })
  .inputValidator((data: { reference: string; email: string }) => data)
  .handler(async ({ data }) => {
    const cfEnv = env as unknown as {
      remeritona_bookings: D1Database;
    };
    const db = cfEnv.remeritona_bookings;
    const booking = await db.prepare(
      `SELECT * FROM bookings WHERE (reference = ? OR UPPER(reference) = UPPER(?)) AND LOWER(guest_email) = LOWER(?) LIMIT 1`
    ).bind(data.reference, data.reference, data.email).first() as any;
    return booking || null;
  });

export const cancelBooking = createServerFn({ method: "POST" })
  .inputValidator((data: CancelData) => data)
  .handler(async ({ data }) => {
    const cfEnv = env as unknown as {
      MAILERSEND_API_KEY: string;
      PAYSTACK_SECRET_KEY: string;
      FLUTTERWAVE_SECRET_KEY: string;
      remeritona_bookings: D1Database;
    };

    try {
      // Server-side guard: check booking status before processing
      const db = cfEnv.remeritona_bookings;
      const booking = await db.prepare(
        `SELECT status FROM bookings WHERE reference = ? LIMIT 1`
      ).bind(data.reference).first() as any;
      if (!booking) {
        return { success: false, error: "Booking not found" };
      }
      if (booking.status === "checked_in" || booking.status === "checked_out" || booking.status === "cancelled") {
        return { success: false, error: "This booking cannot be cancelled." };
      }

      // Process refund if applicable
      if (data.refundAmount > 0) {
        if (data.gateway === "paystack") {
          const res = await fetch("https://api.paystack.co/refund", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfEnv.PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transaction: data.reference,
              amount: data.refundAmount * 100,
            }),
          });
          const result = await res.json() as any;
          if (!result.status) {
            return { success: false, error: "Paystack refund failed: " + result.message };
          }
        } else if (data.gateway === "flutterwave") {
          const res = await fetch(`https://api.flutterwave.com/v3/transactions/${data.reference}/refund`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${cfEnv.FLUTTERWAVE_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ amount: data.refundAmount }),
          });
          const result = await res.json() as any;
          if (result.status !== "success") {
            return { success: false, error: "Flutterwave refund failed: " + result.message };
          }
        }
      }

      // Update D1 database
      if (db) {
        await db.prepare(
          `UPDATE bookings SET status = 'cancelled', refund_amount = ?, cancelled_at = ? WHERE reference = ?`
        )
          .bind(data.refundAmount, new Date().toISOString(), data.reference)
          .run();
      }

      // Send cancellation email to guest
      const mailerSend = new MailerSend({ apiKey: cfEnv.MAILERSEND_API_KEY });
      const sentFrom = new Sender("booking@remeritonahotel.com", "Remeritona Hotel");

      const guestHtml = `
        <div style="background:#111;color:#ddd;font-family:sans-serif;padding:20px;">
          <h2 style="color:#c9a84c;">Booking Cancellation Confirmed</h2>
          <p>Dear ${data.guestName},</p>
          <p>Your reservation for <strong>${data.roomName}</strong> (Check-in: ${data.checkIn}) has been cancelled.</p>
          <p style="color:#c9a84c;">
            ${data.refundAmount > 0
              ? `Refund of ₦${data.refundAmount.toLocaleString()} has been initiated via ${data.gateway === "paystack" ? "Paystack" : "Flutterwave"}.`
              : "Per our cancellation policy, no refund is applicable."}
          </p>
          <p>Reference: ${data.reference}</p>
          <p>If you have any questions, please contact us directly.</p>
        </div>
      `;

      const hotelHtml = `
        <h2>Booking Cancellation</h2>
        <p><strong>Guest:</strong> ${data.guestName}</p>
        <p><strong>Email:</strong> ${data.guestEmail}</p>
        <p><strong>Room:</strong> ${data.roomName}</p>
        <p><strong>Check-in:</strong> ${data.checkIn}</p>
        <p><strong>Refund:</strong> ₦${data.refundAmount.toLocaleString()}</p>
        <p><strong>Reference:</strong> ${data.reference}</p>
      `;

      // Email to Guest
await mailerSend.email.send(
  new EmailParams()
    .setFrom(new Recipient("booking@remeritonahotel.com", "Remeritona Hotel"))
    .setTo([new Recipient(data.guestEmail, data.guestName)])
    .setSubject(`Booking Cancelled - ${data.roomName} | Ref: ${data.reference}`)
    .setHtml(guestHtml)
);

// Email to Hotel 
await mailerSend.email.send(
  new EmailParams()
    .setFrom(new Recipient("booking@remeritonahotel.com", "Remeritona Hotel"))
    .setTo([new Recipient("alexekums@gmail.com", "Remeritona Hotel")])  // Your email
    .setSubject(`Cancellation Alert | ${data.guestName}`)
    .setHtml(hotelHtml)
);

      return { success: true, refundAmount: data.refundAmount };
    } catch (error) {
      console.error("Cancellation error:", error);
      return { success: false, error: String(error) };
    }
  });