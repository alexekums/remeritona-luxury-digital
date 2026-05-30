// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/messages/conversation")({
  server: {
    handlers: {
      DELETE: async ({ request }: { request: Request }) => {
        try {
          const { env } = await import("cloudflare:workers");
          const db = (env as unknown as { 
            remeritona_bookings: D1Database 
          }).remeritona_bookings;
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const room = new URL(request.url).searchParams.get("room");
          if (!room) {
            return jsonResponse({ success: false, error: "room is required" }, 400);
          }

          await db.prepare(
            `DELETE FROM messages WHERE room_number = ? AND hotel_id = 'remeritona'`
          ).bind(room).run();

          return jsonResponse({ success: true });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
