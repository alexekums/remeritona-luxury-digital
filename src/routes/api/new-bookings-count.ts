// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/new-bookings-count")({
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

          // Count bookings created today with pending or confirmed status
          const result = await db.prepare(`
            SELECT COUNT(*) as count,
              guest_name,
              room_name,
              reference,
              created_at
            FROM bookings
            WHERE status IN ('pending', 'confirmed')
            AND date(created_at) = date('now')
            ORDER BY created_at DESC
            LIMIT 1
          `).first() as any;

          return Response.json({
            count: result?.count ?? 0,
            latest: result ? {
              guest_name: result.guest_name,
              room_name: result.room_name,
              reference: result.reference,
              created_at: result.created_at
            } : null
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
