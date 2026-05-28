// @ts-ignore
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { extractToken, getDb, jsonResponse, validateAdminToken } from "@/lib/pms-api";

export const APIRoute = createAPIFileRoute("/api/orders-and-requests")({
  GET: async ({ request, context }: { request: Request; context: any }) => {
    try {
      const db = getDb(context);
      if (!db) return jsonResponse({ success: false, error: "DB not available" }, 500);

      const token = extractToken(request);
      if (!(await validateAdminToken(db, token))) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401);
      }

      const url = new URL(request.url);
      const statusFilter = url.searchParams.get("status");
      const typeFilter = url.searchParams.get("type");
      const roomFilter = url.searchParams.get("room");

      const [ordersResult, requestsResult] = await Promise.all([
        db.prepare(
          `SELECT * FROM room_orders WHERE hotel_id = 'remeritona' ORDER BY created_at DESC`
        ).all(),
        db.prepare(
          `SELECT * FROM guest_requests WHERE hotel_id = 'remeritona' ORDER BY created_at DESC`
        ).all(),
      ]);

      let items: any[] = [
        ...(ordersResult.results ?? []).map((o: any) => ({
          ...o,
          type: "dining" as const,
          total: o.total ?? o.total_amount,
        })),
        ...(requestsResult.results ?? []).map((r: any) => ({
          ...r,
          type: "service" as const,
        })),
      ];

      if (statusFilter) {
        items = items.filter((i) => i.status === statusFilter);
      }
      if (typeFilter === "dining") {
        items = items.filter((i) => i.type === "dining");
      } else if (typeFilter === "service") {
        items = items.filter((i) => i.type === "service");
      }
      if (roomFilter) {
        items = items.filter((i) => String(i.room_number) === String(roomFilter));
      }

      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const [pendingOrders, pendingRequests] = await Promise.all([
        db.prepare(
          `SELECT COUNT(*) as c FROM room_orders WHERE hotel_id = 'remeritona' AND status = 'pending'`
        ).first() as Promise<{ c: number } | null>,
        db.prepare(
          `SELECT COUNT(*) as c FROM guest_requests WHERE hotel_id = 'remeritona' AND status = 'pending'`
        ).first() as Promise<{ c: number } | null>,
      ]);
      const pendingCount = (pendingOrders?.c ?? 0) + (pendingRequests?.c ?? 0);

      return jsonResponse({ success: true, items, pendingCount });
    } catch (error) {
      return jsonResponse({ success: false, error: String(error) }, 500);
    }
  },
});
