// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const Route = createFileRoute("/api/messages/reply")({
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

          const body = (await request.json()) as { room_number?: string; message?: string };
          if (!body.room_number || !body.message?.trim()) {
            return jsonResponse({ success: false, error: "room_number and message are required" }, 400);
          }

          const id = crypto.randomUUID();
          await db.prepare(
            `INSERT INTO messages
          (id, hotel_id, guest_id, room_number, sender, message, read, created_at)
         VALUES (?, 'remeritona', '', ?, 'staff', ?, 1, datetime('now'))`
          ).bind(id, body.room_number, body.message.trim()).run();

          const row = await db.prepare(`SELECT * FROM messages WHERE id = ?`).bind(id).first();
          return jsonResponse({ success: true, message: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
