// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/orders-and-requests")({
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
          const diningRows = await db.prepare(`
            SELECT
              CAST(id AS TEXT) as id,
              room_number,
              guest_name,
              items,
              total as total_amount,
              status,
              created_at,
              booking_ref,
              'dining' as type
            FROM room_orders
            WHERE hotel_id = 'remeritona'
            ORDER BY created_at DESC
          `).all();
          const serviceRows = await db.prepare(`
            SELECT
              id,
              room_number,
              guest_name,
              booking_ref,
              request_type,
              notes,
              status,
              created_at,
              'service' as type
            FROM guest_requests
            ORDER BY created_at DESC
          `).all();
          const combined = [
            ...(diningRows.results || []),
            ...(serviceRows.results || []),
          ].sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - 
            new Date(a.created_at).getTime()
          );
          return Response.json({ results: combined });
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
