// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/messages/conversations")({
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
            `SELECT
          m.room_number,
          m.message AS last_message,
          m.created_at AS last_at,
          m.sender AS last_sender,
          SUM(CASE WHEN m.read = 0 AND m.sender = 'guest' THEN 1 ELSE 0 END) AS unread_count,
          g.full_name AS guest_name
        FROM messages m
        LEFT JOIN guests g ON g.room_number = m.room_number
        WHERE m.hotel_id = 'remeritona'
        GROUP BY m.room_number
        ORDER BY MAX(m.created_at) DESC`
          ).all();

          return jsonResponse({ success: true, conversations: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
