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

          // === Loyalty points + Invoice hook on terminal "delivered" status ===
          if (status === "delivered") {
            try {
              // Look up active checked-in guest via bookings → guests join
              const guest = await db.prepare(
                `SELECT g.id, g.tier FROM guests g
                 JOIN bookings b ON b.reference = g.booking_ref
                 WHERE b.room_number = ? AND b.status = 'checked_in'
                 AND g.hotel_id = 'remeritona'
                 LIMIT 1`
              ).bind(row.room_number).first() as { id: string; tier: number } | null;

              if (guest) {
                const orderTotal = Number(row.total_amount ?? 0);

                const tierNum = guest.tier || 1;
                const settingRes = await db.prepare(
                  `SELECT value FROM system_settings WHERE key = ? LIMIT 1`
                ).bind(`loyalty_multiplier_tier${tierNum}`).first() as any;
                
                const tierMultiplier = settingRes ? parseFloat(settingRes.value) : 1.0;

                // Award loyalty points: floor(total / 1000 * tierMultiplier)
                const earned = Math.floor((orderTotal / 1000) * tierMultiplier);
                if (earned > 0) {
                  await db.prepare(
                    `UPDATE guests SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?`
                  ).bind(earned, guest.id).run();
                }

                // Insert dining charge into guest's billing folio
                await db.prepare(
                  `INSERT INTO invoices (guest_id, room_number, description, subtotal, tax, total, hotel_id)
                   VALUES (?, ?, ?, ?, ?, ?, 'remeritona')`
                ).bind(
                  guest.id,
                  row.room_number,
                  `Dining Order #${row.id}`,
                  orderTotal,
                  0,
                  orderTotal
                ).run();
              }
            } catch (hookErr) {
              // Log but don't fail the status update if the hook errors
              console.error("Loyalty/invoice hook error (dining):", hookErr);
            }
          }

          return jsonResponse({ success: true, item: row });
        } catch (error) {
          return jsonResponse({ success: false, error: String(error) }, 500);
        }
      },
    },
  },
});
