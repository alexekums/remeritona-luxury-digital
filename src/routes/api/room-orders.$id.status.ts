// @ts-ignore
import { createAPIFileRoute } from "@tanstack/react-start/api";
import {
  extractToken,
  getDb,
  jsonResponse,
  ROOM_ORDER_STATUSES,
  validateAdminToken,
} from "@/lib/pms-api";

export const APIRoute = createAPIFileRoute("/api/room-orders/$id/status")({
  PATCH: async ({
    request,
    context,
    params,
  }: {
    request: Request;
    context: any;
    params: { id: string };
  }) => {
    try {
      const db = getDb(context);
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

      await db.prepare(
        `UPDATE room_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind(status, params.id).run();

      const row = await db.prepare(`SELECT * FROM room_orders WHERE id = ?`).bind(params.id).first();
      if (!row) return jsonResponse({ success: false, error: "Order not found" }, 404);

      return jsonResponse({ success: true, item: { ...row, type: "dining" } });
    } catch (error) {
      return jsonResponse({ success: false, error: String(error) }, 500);
    }
  },
});
