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

          const url = new URL(request.url);
          let room = url.searchParams.get("room");
          const guestId = url.searchParams.get("guestId");

          // Architectural Fallback: If a client handles threads via guestId, 
          // resolve the assigned room number dynamically to prevent vanishing threads
          if (!room && guestId) {
            const assignedGuest = await db.prepare(
              `SELECT room_number FROM guests WHERE id = ? LIMIT 1`
            ).bind(guestId).first() as { room_number?: string } | null;
            
            if (assignedGuest?.room_number) {
              room = assignedGuest.room_number;
            }
          }

          if (!room) return jsonResponse({ success: false, error: "room or guestId parameter is required" }, 400);

          // Filter by both room_number and guest_id to prevent data bleeding between guests
          const result = await db.prepare(
            `SELECT * FROM messages WHERE room_number = ? AND guest_id = ? ORDER BY created_at ASC`
          ).bind(room, guestId || '').all();

          return jsonResponse({ success: true, messages: result.results ?? [] });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});