// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/sync-reservations")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const { env } = await import("cloudflare:workers");
          const db = (env as unknown as {
            remeritona_bookings: D1Database
          }).remeritona_bookings;
          if (!db) {
            return Response.json(
              { error: "DB not available" },
              { status: 500 }
            );
          }
          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return Response.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }

          // Find all confirmed bookings with future check_in and assigned room_number
          const bookings = await db.prepare(`
            SELECT reference, guest_name, room_number, check_in
            FROM bookings
            WHERE status = 'confirmed'
            AND room_number IS NOT NULL
            AND room_number != ''
            AND date(check_in) > date('now')
          `).all();

          const bookingsList = bookings.results ?? [];
          let updatedCount = 0;

          for (const booking of bookingsList as any) {
            // Check if room is already reserved or occupied
            const room = await db.prepare(
              `SELECT status FROM room_status WHERE room_number = ? AND hotel_id = 'remeritona' LIMIT 1`
            ).bind(booking.room_number).first() as any;

            // Only reserve if room is vacant (clean or dirty)
            if (room && (room.status === 'vacant_clean' || room.status === 'vacant_dirty')) {
              await db.prepare(`
                UPDATE room_status
                SET status = 'reserved',
                    reserved_for = ?,
                    reserved_until = ?,
                    reserved_ref = ?,
                    updated_at = datetime('now'),
                    updated_by = 'auto-reserve'
                WHERE room_number = ? AND hotel_id = 'remeritona'
              `).bind(booking.guest_name, booking.check_in, booking.reference, booking.room_number).run();
              updatedCount++;
            }
          }

          return Response.json({
            success: true,
            message: `Synced ${updatedCount} reservations`,
            updatedCount
          });
        } catch (error) {
          return Response.json(
            { error: String(error) },
            { status: 500 }
          );
        }
      },
    },
  },
});
