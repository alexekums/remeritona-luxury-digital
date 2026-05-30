// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/messages/thread")({
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

          const room = new URL(request.url).searchParams.get("room");
          if (!room) return jsonResponse({ success: false, error: "room is required" }, 400);

          const result = await db.prepare(
            `SELECT * FROM messages WHERE room_number = ? ORDER BY created_at ASC`
          ).bind(room).all();

          return jsonResponse({ success: true, messages: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
