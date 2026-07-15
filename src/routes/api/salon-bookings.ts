// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/salon-bookings")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const result = await db.prepare(
            `SELECT s.*, 
            
         FROM spa_bookings s
         LEFT JOIN guests g ON g.room_number = s.room_number
         WHERE s.hotel_id = 'remeritona'
         ORDER BY s.preferred_date ASC, s.preferred_time ASC`
          ).all();

          return jsonResponse({ success: true, bookings: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
