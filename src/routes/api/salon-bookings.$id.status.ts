// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export const Route = createFileRoute("/api/salon-bookings/$id/status")({
  server: {
    handlers: {
      PATCH: async ({
        request,
        params,
      }: {
        request: Request;
        params: { id: string };
      }) => {
        try {
          const db = await getDb();
          if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

          const token = extractToken(request);
          if (!(await validateAdminToken(db, token))) {
            return jsonResponse({ success: false, error: "Unauthorized" }, 401);
          }

          const body = (await request.json()) as {
            status?: string;
            preferred_date?: string;
            preferred_time?: string;
          };

          if (!body.status || !VALID_STATUSES.includes(body.status)) {
            return jsonResponse(
              { success: false, error: `Invalid status. Allowed: ${VALID_STATUSES.join(", ")}` },
              400
            );
          }

          await db.prepare(
            `UPDATE spa_bookings
         SET status = ?,
             preferred_date = COALESCE(?, preferred_date),
             preferred_time = COALESCE(?, preferred_time)
         WHERE id = ?`
          ).bind(
            body.status,
            body.preferred_date ?? null,
            body.preferred_time ?? null,
            params.id
          ).run();

          const row = await db.prepare(
            `SELECT s.*, g.full_name AS guest_name
         FROM spa_bookings s
         LEFT JOIN guests g ON g.room_number = s.room_number
         WHERE s.id = ?`
          ).bind(params.id).first();

          if (!row) return jsonResponse({ success: false, error: "Booking not found" }, 404);

          return jsonResponse({ success: true, booking: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
