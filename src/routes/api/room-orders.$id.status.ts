// @ts-ignore
import { createFileRoute } from "@tanstack/react-router";
import {
  extractToken,
  getDb,
  getTableColumnNames,
  jsonResponse,
  ROOM_ORDER_STATUSES,
  tableHasColumn,
  validateAdminToken,
} from "@/lib/pms-api";

export const Route = createFileRoute("/api/room-orders/$id/status")({
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

          const body = (await request.json()) as { status?: string };
          const status = body.status;
          if (!status || !ROOM_ORDER_STATUSES.includes(status as typeof ROOM_ORDER_STATUSES[number])) {
            return jsonResponse(
              { success: false, error: `Invalid status. Allowed: ${ROOM_ORDER_STATUSES.join(", ")}` },
              400
            );
          }

          const roomOrderColumns = await getTableColumnNames(db, "room_orders");
          const updateSql = tableHasColumn(roomOrderColumns, "updated_at")
            ? `UPDATE room_orders SET status = ?, updated_at = datetime('now') WHERE id = CAST(? AS INTEGER)`
            : `UPDATE room_orders SET status = ? WHERE id = CAST(? AS INTEGER)`;

          await db.prepare(updateSql).bind(status, params.id).run();

          const row = await db.prepare(
            `SELECT
          CAST(id AS TEXT) AS id,
          hotel_id,
          room_number,
          guest_name,
          items,
          total AS total_amount,
          status,
          created_at,
          'dining' AS type,
          booking_ref
        FROM room_orders
        WHERE id = CAST(? AS INTEGER)`
          ).bind(params.id).first();

          if (!row) return jsonResponse({ success: false, error: "Order not found" }, 404);

          return jsonResponse({ success: true, item: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
