import { createFileRoute } from "@tanstack/react-router";
import { resolveGuestProfile } from "../../lib/guest-profile";

export const Route = createFileRoute("/api/save-booking")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const data = (await request.json()) as any;
          const { env } = await import("cloudflare:workers");
          const db = (env as unknown as { remeritona_bookings: D1Database }).remeritona_bookings;

          if (!db) {
            return new Response(JSON.stringify({ success: false, error: "DB not available" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const guestProfileId = await resolveGuestProfile(
            db,
            data.guest.name,
            data.guest.email,
            data.guest.phone
          );

          await db
            .prepare(
              `INSERT OR IGNORE INTO bookings (reference, created_at, guest_name, guest_email, guest_phone, guest_notes, room_slug, room_name, room_price, check_in, check_out, nights, num_rooms, guests, addons, subtotal, discount, tax, total, gateway, payment_mode, status, guest_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .bind(
              data.reference,
              data.createdAt,
              data.guest.name,
              data.guest.email,
              data.guest.phone,
              data.guest.notes || "",
              data.roomSlug,
              data.roomName,
              data.roomPrice,
              data.checkIn,
              data.checkOut,
              data.nights,
              data.numRooms,
              data.guests,
              JSON.stringify(data.addons),
              data.subtotal,
              data.discount,
              data.tax,
              data.total,
              data.gateway,
              data.paymentMode,
              data.status,
              guestProfileId
            )
            .run();

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: String(error) }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
