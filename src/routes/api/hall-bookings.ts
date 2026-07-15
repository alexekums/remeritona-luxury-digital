import { createFileRoute } from "@tanstack/react-router";
import { getDb, jsonResponse } from "@/lib/pms-api";

export const Route = createFileRoute("/api/hall-bookings")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          // Return all confirmed or pending bookings to block out dates
          const result = await db.prepare(
            `SELECT hall_type, booking_date, status FROM hall_bookings WHERE status IN ('confirmed', 'pending')`
          ).all();

          return jsonResponse({ success: true, bookings: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
      POST: async ({ request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const body = (await request.json()) as {
            hall_type: string;
            guest_name: string;
            guest_email: string;
            guest_phone: string;
            booking_date: string;
            amount: number;
            reference: string;
          };

          if (!body.hall_type || !body.booking_date || !body.guest_name || !body.reference) {
            return jsonResponse({ success: false, error: "Missing required fields" }, 400);
          }

          // Check if already booked
          const existing = await db.prepare(
            `SELECT id FROM hall_bookings WHERE hall_type = ? AND booking_date = ? AND status IN ('confirmed', 'pending')`
          ).bind(body.hall_type, body.booking_date).first();

          if (existing) {
            return jsonResponse({ success: false, error: "Hall is already booked for this date" }, 400);
          }

          await db.prepare(
            `INSERT INTO hall_bookings (hall_type, guest_name, guest_email, guest_phone, booking_date, amount, reference)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            body.hall_type,
            body.guest_name,
            body.guest_email,
            body.guest_phone,
            body.booking_date,
            body.amount,
            body.reference
          ).run();

          // Mock Email Automation Payload for SMTP integration later
          console.log("========== EMAIL PAYLOAD START ==========");
          console.log(JSON.stringify({
            to: body.guest_email,
            subject: `Venue Booking Request Received - ${body.reference}`,
            template: "venue_booking_confirmation",
            data: {
              guest_name: body.guest_name,
              guest_phone: body.guest_phone,
              hall_type: body.hall_type,
              booking_date: body.booking_date,
              amount: body.amount,
              reference: body.reference,
              status: "pending_payment",
            }
          }, null, 2));
          console.log("========== EMAIL PAYLOAD END ==========");

          return jsonResponse({ success: true });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
