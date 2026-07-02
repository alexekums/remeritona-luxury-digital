// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/bookings-active-count" as any)({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const { env } = await import("cloudflare:workers");
          const db = (env as unknown as { remeritona_bookings: D1Database }).remeritona_bookings;
          
          if (!db) {
            return Response.json({ error: "DB not available" }, { status: 500 });
          }

          // Mirroring your clean token extraction architecture
          const authHeader = request.headers.get("Authorization") || request.headers.get("X-Admin-Token") || "";
          const token = authHeader.replace("Bearer ", "").trim();

          if (!token) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          // Verify token against active staff sessions
          const session = await db.prepare(
            `SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime('now') LIMIT 1`
          ).bind(token).first();

          if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
          }

          // Query live, confirmed active bookings 
          const result = await db.prepare(
            `SELECT COUNT(*) as count FROM bookings WHERE hotel_id = 'remeritona' AND status = 'confirmed'`
          ).first() as { count: number } | null;

          return Response.json({ success: true, count: result?.count ?? 0 });
        } catch (error) {
          return Response.json({ success: false, error: String(error) }, { status: 500 });
        }
      },
    },
  },
});