// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/bookings-recent")({
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

          // Fetch recent pending bookings from today
          const bookings = await db.prepare(`
            SELECT reference, guest_name, room_name, check_in, check_out, status, created_at
            FROM bookings
            WHERE status = 'pending'
            AND date(created_at) = date('now')
            ORDER BY created_at DESC
            LIMIT 5
          `).all();

          return Response.json({ results: bookings.results ?? [] });
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
