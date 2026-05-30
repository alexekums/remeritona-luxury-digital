// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/messages/mark-read")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const body = (await request.json()) as { room_number?: string };
          if (!body.room_number) {
            return jsonResponse({ success: false, error: "room_number is required" }, 400);
          }

          await db.prepare(
            `UPDATE messages SET read = 1 WHERE room_number = ? AND sender = 'guest'`
          ).bind(body.room_number).run();

          return jsonResponse({ success: true });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
